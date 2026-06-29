import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../services/api';

// SignalR is loaded as a global via a CDN <script> tag in index.html
// (see "SignalR client" there) instead of being bundled as an npm dependency.
const signalR = window.signalR;

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
    if (!signalR) {
      console.error('SignalR client not loaded (CDN script missing in index.html). Real-time booking updates disabled; falling back to timer polling.');
      return undefined;
    }

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
