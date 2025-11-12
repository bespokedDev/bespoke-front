import { cookies } from "next/headers";
import { ReportHistoryClient } from "./ReportHistoryClient";
import type { SavedReportSummary } from "@/models/report";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const fetchReportHistory = async (
  authToken?: string
): Promise<SavedReportSummary[]> => {
  if (!API_BASE_URL) {
    console.error("Missing NEXT_PUBLIC_API_BASE_URL environment variable.");
    return [];
  }

  if (!authToken) {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE_URL}api/general-payment-tracker`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch report history: ${response.statusText}`
      );
    }

    return response.json();
  } catch (error) {
    console.error("[ReportHistoryPage] Error loading data.", error);
    return [];
  }
};

export default async function ReportHistoryPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("authToken")?.value;
  const initialReports = await fetchReportHistory(authToken);
  return <ReportHistoryClient initialReports={initialReports} />;
}
