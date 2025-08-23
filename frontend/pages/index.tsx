export default function Home() {
    if (typeof window !== 'undefined') location.replace('/devices');
    return null;
}