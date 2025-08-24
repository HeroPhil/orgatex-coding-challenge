'use client';

import type { AppProps } from 'next/app';
import Link from 'next/link';
import { AuthProvider, useAuth } from '../components/auth-context';
import { useEffect } from 'react';
import { sign } from 'crypto';

export default function App({ Component, pageProps }: AppProps) {

    return (
        <AuthProvider>
            <div style={{ fontFamily: 'system-ui', padding: 16 }}>
                <AuthGuard>
                    <Component {...pageProps} />
                </AuthGuard>
            </div>
        </AuthProvider>
    );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { ready, isSignedIn } = useAuth()

    useEffect(() => {
        if (!ready) {
            return;
        }

        // forward to / page if not signed in and if not already on this page
        if (!isSignedIn && window.location.pathname !== '/') {
            window.location.href = '/';
        }

        // forward to /devices page if signed in and if on the / page
        if (isSignedIn && window.location.pathname === '/') {
            window.location.href = '/devices';
        }
    }, [ready, isSignedIn]);

    return <>
        {isSignedIn && <PageHeader />}
        {children}
    </>;
}

function PageHeader({ children }: { children?: React.ReactNode }) {

    const { signOut } = useAuth();

    return (
        <>
            <header>
                <h1>Smart Factory</h1>
                <nav style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    <Link href="/devices">Devices</Link>
                    <Link href="/metrics">Metrics</Link>
                    <span style={{ flexGrow: 1 }}></span>
                    <div>
                        <button onClick={signOut}>Logout</button>
                    </div>
                </nav>
                {children}
            </header>
        </>
    );
}