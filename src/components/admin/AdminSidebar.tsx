"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
	active?: "dashboard" | "users" | "scenarios" | "analytics";
};

export default function AdminSidebar({ active }: Props) {
	const router = useRouter();
	const [collapsed, setCollapsed] = useState(false); // compact mode (icons only)
	const [mobileOpen, setMobileOpen] = useState(false); // mobile slide-over

	async function handleLogout() {
		await supabase.auth.signOut();
		router.push("/auth");
	}

	const items: { key: Props["active"]; label: string; href: string; icon: React.ReactNode }[] = [
		{ key: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 13h8V3H3v10zM3 21h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
		{ key: "users", label: "Manage Users", href: "/admin/users", icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-3-3.87M7 21v-2a4 4 0 013-3.87M12 7a4 4 0 110-8 4 4 0 010 8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
		{ key: "scenarios", label: "Manage Scenarios", href: "/admin/scenario", icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M4 12h10M4 17h16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
		{ key: "analytics", label: "Analytics", href: "/admin/analytics", icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 9v6M13 6v9M8 12v3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
	];

	return (
		<>
			{/* Mobile toggle button */}
			<div className="md:hidden p-3">
				<button
					onClick={() => setMobileOpen(true)}
					className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white shadow"
					aria-label="Open menu"
				>
					<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
					Menu
				</button>
			</div>

			{/* Desktop sidebar */}
			<aside className={`hidden md:flex flex-col bg-white rounded-2xl shadow p-3 h-[calc(100vh-32px)] sticky top-4 transition-all ${collapsed ? "w-20" : "w-64"}`}>
				<div className="flex items-center justify-between px-2 mb-4">
					<div className={`flex items-center gap-2 ${collapsed ? "justify-center w-full" : ""}`}>
						<div className="bg-indigo-600 text-white rounded-md w-8 h-8 flex items-center justify-center font-bold">A</div>
						{!collapsed && <div className="text-sm font-bold text-gray-900">Admin</div>}
					</div>

					{/* collapse toggle */}
					<button
						onClick={() => setCollapsed(!collapsed)}
						className="p-1 rounded hover:bg-gray-100"
						title={collapsed ? "Expand" : "Collapse"}
					>
						<svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d={collapsed ? "M6 9l6 6 6-6" : "M18 15l-6-6-6 6"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
					</button>
				</div>

				<nav className="flex-1 overflow-y-auto">
					<ul className="space-y-1">
						{items.map((it) => {
							const isActive = active === it.key;
							return (
								<li key={it.key}>
									<button
										onClick={() => router.push(it.href)}
										className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition ${isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100"}`}
									>
										<span className="flex-shrink-0 text-gray-600">{it.icon}</span>
										{!collapsed && <span className="text-sm">{it.label}</span>}
									</button>
								</li>
							);
						})}
					</ul>
				</nav>

				<div className="mt-4">
					<button
						onClick={() => router.push("/chat")}
						className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm ${collapsed ? "justify-center" : ""} text-gray-600 hover:bg-gray-100`}
					>
						<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
						{!collapsed && <span>Open Chat</span>}
					</button>

					<button onClick={handleLogout} className={`mt-3 w-full px-3 py-2 rounded-lg text-white ${collapsed ? "text-center" : ""} bg-red-600 hover:bg-red-700`}>
						{!collapsed ? "Logout" : <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 17l5-5-5-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12H9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
					</button>
				</div>
			</aside>

			{/* Mobile slide-over */}
			{mobileOpen && (
				<div className="fixed inset-0 z-50 flex">
					{/* overlay */}
					<button className="fixed inset-0 bg-black bg-opacity-40" onClick={() => setMobileOpen(false)} />
					<div className="relative bg-white w-72 p-4 h-full overflow-y-auto shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<div>
								<div className="text-lg font-bold">Admin</div>
								<div className="text-xs text-gray-500">Control center</div>
							</div>
							<button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-gray-100">
								<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
							</button>
						</div>

						<nav>
							<ul className="space-y-1">
								{items.map((it) => {
									const isActive = active === it.key;
									return (
										<li key={it.key}>
											<button
												onClick={() => { setMobileOpen(false); router.push(it.href); }}
												className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition ${isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100"}`}
											>
												<span className="flex-shrink-0 text-gray-600">{it.icon}</span>
												<span className="text-sm">{it.label}</span>
											</button>
										</li>
									);
								})}
							</ul>

							<div className="mt-6">
								<button onClick={() => { setMobileOpen(false); router.push("/chat"); }} className="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Open Chat</button>
								<button onClick={() => { setMobileOpen(false); handleLogout(); }} className="mt-3 w-full px-3 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700">Logout</button>
							</div>
						</nav>
					</div>
				</div>
			)}
		</>
	);
}
