import api from '../services/api';

// Cache original console methods to prevent infinite loop/recursion
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

let isLogging = false;

async function sendLog(level, message, stack = null) {
  if (isLogging) {
    // If the logger itself triggers logging, print to original console and stop
    originalConsole.error('Circular logging detected. Log message: ', message);
    return;
  }

  isLogging = true;
  try {
    const timestamp = new Date().toLocaleString();
    // Use the api instance which points to the correct base url/endpoint
    await api.post('/Debug/LogFrontend', {
      level,
      message,
      timestamp,
      stack
    });
  } catch (err) {
    // Fail silently in terms of forwarding, but print to original console
    originalConsole.error('Failed to send log to server:', err);
  } finally {
    isLogging = false;
  }
}

// Override console methods to intercept errors and warnings
console.warn = (...args) => {
  originalConsole.warn(...args);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  sendLog('WARN', message);
};

console.error = (...args) => {
  originalConsole.error(...args);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  
  // Find if one of the arguments is an Error object to extract the stack trace
  const errorArg = args.find(arg => arg instanceof Error);
  const stack = errorArg ? errorArg.stack : null;
  sendLog('ERROR', message, stack);
};

// Global unhandled error handlers
window.addEventListener('error', (event) => {
  const message = event.message || 'Unknown error';
  const stack = event.error ? event.error.stack : null;
  sendLog('CRITICAL', `Unhandled Error: ${message}`, stack);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason ? (reason.message || String(reason)) : 'Unhandled promise rejection';
  const stack = reason && reason.stack ? reason.stack : null;
  sendLog('CRITICAL', `Unhandled Rejection: ${message}`, stack);
});

// Export a clean manual logger utility
const logger = {
  info: (message) => {
    originalConsole.info(`[INFO] ${message}`);
    sendLog('INFO', message);
  },
  warn: (message) => {
    console.warn(message); // This will automatically trigger console.warn wrapper
  },
  error: (message, error) => {
    if (error) {
      console.error(message, error); // This will automatically trigger console.error wrapper
    } else {
      console.error(message);
    }
  }
};

export default logger;
