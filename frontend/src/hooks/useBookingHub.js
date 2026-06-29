import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../services/api';

/**
 * Subscribes to real-time booking events from the backend SignalR hub.
 *
 * Reuses the existing session cookie for auth (withCredentials), so only
 * staff/admin connections are placed in the server-side "staff" group and
 * receive events. Timer polling on the consuming pages stays in place as a
 * fallback for when the socket is down.
 *
 * @param {(payload: object) => void} onBookingCreated - called when a new booking is created.
 */
export const useBookingHub = (onBookingCreated) => {
  const callbackRef = useRef(onBookingCreated);

  useEffect(() => {
    callbackRef.current = onBookingCreated;
  }, [onBookingCreated]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/bookings`, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('BookingCreated', (payload) => {
      if (callbackRef.current) callbackRef.current(payload);
    });

    let cancelled = false;
    connection
      .start()
      .catch((err) => {
        if (!cancelled) console.error('BookingHub connection failed:', err);
      });

    return () => {
      cancelled = true;
      connection.stop();
    };
  }, []);
};

export default useBookingHub;
