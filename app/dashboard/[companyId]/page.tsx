import DashboardSettings from './settings-client'

export default async function CompanyDashboard(props: { params: Promise<{ companyId: string }> }) {
  const params = await props.params
  return <DashboardSettings companyId={params.companyId} />
}
