import { useRouter } from "next/router";

export default function DevicesPage() {

    const router = useRouter();

    const { id } = router.query;

    return <div>{id} Device Page</div>;
}