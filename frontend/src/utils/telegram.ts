// Initialize Telegram WebApp
export const initTelegram = () => {
  try {
    // @ts-ignore - Telegram WebApp is injected by Telegram
    const WebApp = window.Telegram?.WebApp;
    
    if (!WebApp) {
      console.warn('Telegram WebApp is not available. Are you running outside of Telegram?');
      return null;
    }
    
    console.log('Initializing Telegram WebApp...');
    
    // Initialize the WebApp
    WebApp.ready();
    WebApp.expand();
    
    // Log WebApp data for debugging
    console.log('Telegram WebApp initialized:', {
      version: WebApp.version,
      platform: WebApp.platform,
      colorScheme: WebApp.colorScheme,
      themeParams: WebApp.themeParams,
      viewportHeight: WebApp.viewportHeight,
      viewportStableHeight: WebApp.viewportStableHeight,
    });
    
    // Return the Telegram user ID if available
    if (WebApp.initDataUnsafe?.user?.id) {
      console.log('Telegram user ID:', WebApp.initDataUnsafe.user.id);
      return WebApp.initDataUnsafe.user.id.toString();
    } else {
      console.warn('Telegram user ID not available in initDataUnsafe');
      // Try to get user info from another source if available
      // @ts-ignore
      if (WebApp.initData && WebApp.initData.user) {
        // @ts-ignore
        console.log('Found user in initData:', WebApp.initData.user.id);
        // @ts-ignore
        return WebApp.initData.user.id.toString();
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error initializing Telegram WebApp:', error);
    return null;
  }
};

// Check if running inside Telegram WebApp
export const isTelegramWebApp = () => {
  try {
    // @ts-ignore - Telegram WebApp is injected by Telegram
    return !!window.Telegram?.WebApp;
  } catch (error) {
    console.error('Error checking Telegram WebApp:', error);
    return false;
  }
};
