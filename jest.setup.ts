import '@testing-library/jest-dom';

// Mock chrome API for testing
declare global {
  namespace globalThis {
    var chrome: any;
  }
}

global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};
