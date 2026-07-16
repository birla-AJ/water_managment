import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { store } from './app/store';
import { ColorModeProvider } from './theme/ColorModeContext';
import './i18n';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ColorModeProvider>
          <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SnackbarProvider>
        </ColorModeProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
