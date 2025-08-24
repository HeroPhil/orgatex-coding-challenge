'use client';

import { useState } from "react";
import { useAuth } from "../components/auth-context";

export default function Home() {

    const { signIn } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await signIn(username, password) !== undefined) {
            window.location.href = "/devices";
            return;
        }
        alert("Login failed");
    };

    return (
        <>
            <h1>Welcome to the Orgatex Smart Factory</h1>
            <form onSubmit={handleSubmit}>
                <label htmlFor="username">Username</label>
                <input
                    type="text"
                    name="username"
                    id="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                />
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    name="password"
                    id="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button type="submit">Login</button>
            </form>
        </>
    );
}