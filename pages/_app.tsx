import '../styles/globals.css';
import {SessionProvider} from "next-auth/react";
import {createTheme, NextUIProvider} from "@nextui-org/react";
import {ThemeProvider as NextThemesProvider} from 'next-themes';
import type {AppProps} from 'next/app';
import {SSRProvider} from "@react-aria/ssr";
import Header from "../components/header";

export default function App({Component, pageProps: {session, ...pageProps}}: AppProps) {
    const lightTheme = createTheme({
        type: 'light'
    });

    const darkTheme = createTheme({
        type: 'dark',
        // theme: {
        //     colors: {
        //         background: '#1d1d1d',
        //         text: '#d52121'
        //     }
        // }
    });

    return (
        <SSRProvider>
            <NextThemesProvider defaultTheme="system" attribute="class" value={{light: lightTheme, dark: darkTheme}}>
                <NextUIProvider>
                    <SessionProvider session={session}>
                        <Header/>
                        <Component {...pageProps} />
                    </SessionProvider>
                </NextUIProvider>
            </NextThemesProvider>
        </SSRProvider>
    );
}