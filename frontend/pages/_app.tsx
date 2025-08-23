import type { AppProps } from 'next/app';
import Link from 'next/link';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <div style={{ fontFamily: 'system-ui', padding: 16 }}>
            <header>
                <h2>Smart Factory</h2>
                <Link href="/devices">Devices</Link>
            </header>
            <Component {...pageProps} />
        </div>
    );
}