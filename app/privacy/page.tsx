import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
                <Link href="/inventory" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>

                <h1 className="mb-6 text-3xl font-bold text-slate-900">Privacy Policy</h1>
                <p className="mb-8 text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="space-y-6 text-slate-700">
                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">1. Information Collection</h2>
                        <p>
                            The JTAP Inventory Asset Management System collects specific information to effectively track and manage company assets. This includes:
                        </p>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>Employee Name and ID</li>
                            <li>Department</li>
                            <li>Asset assignment history</li>
                            <li>System usage logs (login times, actions performed)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">2. Use of Information</h2>
                        <p>
                            The collected information is used strictly for:
                        </p>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>Tracking the location and status of company assets.</li>
                            <li>Conducting inventory audits.</li>
                            <li>Ensuring accountability for assigned equipment.</li>
                            <li>System security and maintenance.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">3. Data Protection</h2>
                        <p>
                            We implement appropriate security measures to protect your personal information and asset data from unauthorized access, alteration, disclosure, or destruction. Access to sensitive data is restricted to authorized personnel only.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">4. Data Sharing</h2>
                        <p>
                            Your data is internal to JTEKT ASIA PACIFIC CO., LTD. and is not shared with third parties unless required by law or for necessary business operations (e.g., warranty claims with vendors).
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">5. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy or data practices, please contact the Management Information System (MIS) Department.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
