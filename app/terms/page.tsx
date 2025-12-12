import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
                <Link href="/inventory" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>

                <h1 className="mb-6 text-3xl font-bold text-slate-900">Terms of Service</h1>
                <p className="mb-8 text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="space-y-6 text-slate-700">
                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using the JTAP Inventory Asset Management System ("the System"), you agree to comply with and be bound by these Terms of Service. This System is intended solely for official business use by authorized personnel of JTEKT ASIA PACIFIC CO., LTD.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">2. Asset Responsibility</h2>
                        <p>
                            Employees are responsible for the proper care and security of all company assets assigned to them. This includes:
                        </p>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>Protecting assets from theft, damage, or misuse.</li>
                            <li>Not installing unauthorized software on company computers.</li>
                            <li>Returning assets upon request or termination of employment.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">3. Reporting Obligations</h2>
                        <p>
                            Any loss, damage, or malfunction of assigned assets must be reported immediately to the IT or Management Information System (MIS) department. Failure to report may result in disciplinary action.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">4. System Usage</h2>
                        <p>
                            The System is provided for inventory tracking and management purposes. Users must not:
                        </p>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                            <li>Attempt to gain unauthorized access to the System.</li>
                            <li>Modify or delete data without proper authorization.</li>
                            <li>Share login credentials with others.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-slate-900">5. Modifications</h2>
                        <p>
                            We reserve the right to modify these terms at any time. Continued use of the System constitutes acceptance of any changes.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
