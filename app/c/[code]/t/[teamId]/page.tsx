import { TeamScreen } from "@/components/TeamScreen";

export default async function TeamPage({ params }: { params: Promise<{ code: string; teamId: string }> }) {
  const { code, teamId } = await params;
  return <TeamScreen code={code} teamId={teamId} />;
}
