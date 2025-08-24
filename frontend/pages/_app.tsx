import type { AppProps } from 'next/app';
import Link from 'next/link';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <div style={{ fontFamily: 'system-ui', padding: 16 }}>
            <header>
                <h1>Smart Factory</h1>
                <Link href="/devices">Devices</Link>
                <Link href="/metrics">Metrics</Link>
            </header>
            <Component {...pageProps} />
        </div>
    );
}