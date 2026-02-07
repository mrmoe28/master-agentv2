"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  reconnect = true,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  onMessageRef.current = onMessage;
  onOpenRef.current = onOpen;
  onCloseRef.current = onClose;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        setIsConnected(true);
        onOpenRef.current?.();
      };
      ws.onclose = () => {
        setIsConnected(false);
        onCloseRef.current?.();
        if (reconnect) {
          reconnectTimeoutRef.current = setTimeout(
            connect,
            reconnectInterval
          );
        }
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {
          onMessageRef.current?.(event.data);
        }
      };
      ws.onerror = () => {};
      wsRef.current = ws;
    } catch {
      if (reconnect) {
        reconnectTimeoutRef.current = setTimeout(
          connect,
          reconnectInterval
        );
      }
    }
  }, [url, reconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        typeof data === "string" ? data : JSON.stringify(data)
      );
    }
  }, []);

  useEffect(() => {
    if (url) connect();
    return () => disconnect();
  }, [url, connect, disconnect]);

  return { isConnected, send, connect, disconnect };
}
