"use client";

// 채팅 실데이터 훅 — 채널별 초기 스냅샷(getMessages Server Action) + Broadcast 델타를
// id 기준으로 dedupe·병합한다. 공개 채널(room:{roomId})과 개인 인박스 채널
// (room:{roomId}:inbox:{token})을 모두 구독한다.
//
// 비밀 채널(heretic/council)·dm은 서버가 자격 없으면 빈 배열/미배달로 처리하므로,
// 이 훅은 채널 자격을 클라이언트에서 별도로 판단하지 않는다(무차별 UI 원칙 —
// 탭은 전원 노출되지만 데이터는 서버가 격리).
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getMessages, getMyInboxTopic, sendMessage as sendMessageAction } from "@/lib/game/actions";
import { GAME_EVENTS, roomChannel, type ChatMessagePayload } from "@/lib/game/realtime";
import { createClient } from "@/lib/supabase/client";
import type { ChatChannel } from "@/lib/game/types";

/** 스냅샷을 미리 로드해두는 채널. system은 공개 room 채널로 실시간 수신되며, 과거 이력도 함께 로드한다. */
const SNAPSHOT_CHANNELS: readonly ChatChannel[] = ["public", "heretic", "council", "dm", "system"];

export type MessagesByChannel = Record<ChatChannel, ChatMessagePayload[]>;

function emptyMessagesByChannel(): MessagesByChannel {
  return { public: [], heretic: [], council: [], dm: [], system: [] };
}

/** id 기준 dedupe·병합 후 생성 시각 오름차순 정렬 (초기 스냅샷과 broadcast 델타 사이 레이스 대비) */
function mergeById(
  existing: ChatMessagePayload[],
  incoming: ChatMessagePayload[],
): ChatMessagePayload[] {
  const byId = new Map(existing.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

interface UseGameChatOptions {
  roomId: string;
  sessionToken: string;
  /** 현재 활성 탭 채널 — 비활성 채널에 새 메시지가 도착하면 토스트로 알린다 */
  activeChannel?: ChatChannel | null;
  /** (선택) 네트워크 복구 신호(useNetworkRecovery). 값이 바뀌면 스냅샷을 재조회하고
   *  채널을 재구독한다 — 오프라인/백그라운드 중 놓친 메시지를 복원하기 위함. */
  recoveryKey?: number;
}

interface UseGameChatResult {
  messagesByChannel: MessagesByChannel;
  /** 초기 스냅샷 로딩 중 여부 */
  loading: boolean;
  sendMessage: (
    channel: ChatChannel,
    text: string,
    recipientId?: string,
  ) => ReturnType<typeof sendMessageAction>;
}

export function useGameChat({
  roomId,
  sessionToken,
  activeChannel,
  recoveryKey,
}: UseGameChatOptions): UseGameChatResult {
  const [messagesByChannel, setMessagesByChannel] = useState<MessagesByChannel>(
    emptyMessagesByChannel,
  );
  const [loading, setLoading] = useState(true);

  // 최신 activeChannel을 ref로 추적 — 구독 이펙트를 재구성하지 않고도 최신 값을 참조하기 위함.
  const activeChannelRef = useRef(activeChannel ?? null);
  useEffect(() => {
    activeChannelRef.current = activeChannel ?? null;
  }, [activeChannel]);

  // 초기 스냅샷 로드 (채널별) — 이후 broadcast 델타와 id 기준으로 병합한다.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all(SNAPSHOT_CHANNELS.map((channel) => getMessages(sessionToken, channel)))
      .then((results) => {
        if (cancelled) return;
        setMessagesByChannel((prev) => {
          const next = { ...prev };
          SNAPSHOT_CHANNELS.forEach((channel, index) => {
            next[channel] = mergeById(prev[channel], results[index]);
          });
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken, recoveryKey]);

  // 새 메시지를 채널별 state에 병합하고, 비활성 탭에 도착한 메시지는 토스트로 알린다.
  const appendMessage = useCallback((payload: ChatMessagePayload) => {
    setMessagesByChannel((prev) => ({
      ...prev,
      [payload.channel]: mergeById(prev[payload.channel], [payload]),
    }));

    if (activeChannelRef.current !== payload.channel) {
      toast(payload.senderNickname, { description: payload.text });
    }
  }, []);

  // 공개 채널 구독 — public/system 델타
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(roomChannel(roomId))
      .on("broadcast", { event: GAME_EVENTS.CHAT_MESSAGE }, ({ payload }) => {
        appendMessage(payload as ChatMessagePayload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, appendMessage, recoveryKey]);

  // 개인 인박스 채널 구독 — heretic/council/dm 델타.
  // 인박스 토큰은 서버 시크릿으로 계산되므로 클라이언트가 직접 만들 수 없어
  // Server Action(getMyInboxTopic)으로 토픽 문자열을 받아온다.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    getMyInboxTopic(sessionToken).then((topic) => {
      if (cancelled || !topic) return;

      const supabase = createClient();
      const channel = supabase
        .channel(topic)
        .on("broadcast", { event: GAME_EVENTS.CHAT_MESSAGE }, ({ payload }) => {
          appendMessage(payload as ChatMessagePayload);
        })
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [sessionToken, appendMessage, recoveryKey]);

  const sendMessage = useCallback(
    (channel: ChatChannel, text: string, recipientId?: string) =>
      sendMessageAction(sessionToken, channel, text, recipientId),
    [sessionToken],
  );

  return { messagesByChannel, loading, sendMessage };
}
