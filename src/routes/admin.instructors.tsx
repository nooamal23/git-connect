import { createFileRoute } from "@tanstack/react-router";
import { PeopleAdmin } from "@/components/admin/people-admin";

export const Route = createFileRoute("/admin/instructors")({
  component: () => <PeopleAdmin role="instructor" />,
});
