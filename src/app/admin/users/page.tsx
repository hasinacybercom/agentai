"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { supabase } from "@/lib/supabaseClient";

export default function AdminUsersPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState<any>(null);

	// user / scenarios state
	const [users, setUsers] = useState<any[]>([]);
	const [scenarios, setScenarios] = useState<any[]>([]);
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [assignedScenarios, setAssignedScenarios] = useState<any[]>([]); // user_scenarios rows

	useEffect(() => {
		async function init() {
			const { data } = await supabase.auth.getUser();
			if (!data.user) {
				router.push("/auth");
				return;
			}
			setUser(data.user);
			setLoading(false);
		}
		init();
	}, [router]);

	useEffect(() => {
		loadUsers();
		loadScenarios();
	}, []);

	async function loadUsers() {
		const { data } = await supabase.from("profiles").select("id, full_name, role").eq("role", "user");
		setUsers(data ?? []);
	}

	async function loadScenarios() {
		const { data } = await supabase.from("scenarios").select("*");
		setScenarios(data ?? []);
	}

	async function loadAssigned(userId: string) {
		const { data } = await supabase
			.from("user_scenarios")
			.select("id, scenario_id, assigned_at, scenarios ( id, title, content )")
			.eq("user_id", userId)
			.order("assigned_at", { ascending: false });
		setAssignedScenarios(data ?? []);
	}

	// call when selecting a user
	async function handleSelectUser(userId: string) {
		setSelectedUser(userId);
		await loadAssigned(userId);
	}

	// Toggle assign/unassign a scenario for selected user
	async function toggleScenario(scenarioId: string) {
		if (!selectedUser) {
			alert("Select a user first");
			return;
		}

		// check if already assigned
		const existing = assignedScenarios.find((a) => a.scenario_id === scenarioId);

		if (existing) {
			// unassign (delete the user_scenarios row)
			await supabase.from("user_scenarios").delete().eq("id", existing.id);
			setAssignedScenarios((prev) => prev.filter((a) => a.id !== existing.id));
		} else {
			// assign
			const { data, error } = await supabase
				.from("user_scenarios")
				.insert({ user_id: selectedUser, scenario_id: scenarioId })
				.select()
				.single();
			if (error) {
				console.error(error);
				return;
			}
			// refresh assigned list or append
			setAssignedScenarios((prev) => [data, ...prev]);
		}
	}

	if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-start">
				{/* Sidebar */}
				<AdminSidebar active="users" />

				{/* Main content */}
				<main className="space-y-6">
					{/* Header */}
					<header className="flex items-center justify-between gap-4">
						<div>
							<h1 className="text-3xl font-extrabold text-gray-900">Manage Users</h1>
							<p className="text-sm text-gray-500">Invite, view and assign scenarios to users.</p>
						</div>

						<div className="flex items-center gap-3">
							<button
								onClick={() => router.push("/admin/users/invite")}
								className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow hover:bg-indigo-700 transition"
							>
								{/* plus icon */}
								<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
									<path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								Invite user
							</button>
							<button
								onClick={() => loadUsers()}
								className="px-3 py-2 bg-white border rounded-lg text-sm hover:shadow-sm"
							>
								Refresh
							</button>
						</div>
					</header>

					{/* Content grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{/* Users column */}
						<div className="bg-white rounded-2xl shadow p-6">
							<h2 className="text-lg font-semibold mb-4">Users</h2>

							<div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
								{users.map((u) => (
									<div
										key={u.id}
										onClick={() => handleSelectUser(u.id)}
										className={`cursor-pointer p-3 rounded-lg transition flex items-center justify-between ${
											selectedUser === u.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
										}`}
									>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-semibold">
												{(u.full_name || "U").slice(0, 1).toUpperCase()}
											</div>
											<div>
												<div className="font-medium">{u.full_name ?? u.id}</div>
												<div className="text-xs text-gray-500">{u.role}</div>
											</div>
										</div>
										{selectedUser === u.id && <div className="text-xs">Selected</div>}
									</div>
								))}
							</div>

							{/* Assigned */}
							<div className="mt-6">
								<h3 className="text-sm font-medium text-gray-500">Assigned scenarios</h3>
								<div className="mt-2 flex flex-wrap gap-2">
									{assignedScenarios.length === 0 ? (
										<div className="text-sm text-gray-400">No scenarios</div>
									) : (
										assignedScenarios.map((a) => (
											<div key={a.id} className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm">
												{a.scenarios?.title ?? "Scenario"}
											</div>
										))
									)}
								</div>
							</div>
						</div>

						{/* Scenarios column */}
						<div className="bg-white rounded-2xl shadow p-6">
							<h2 className="text-lg font-semibold mb-4">Scenarios</h2>

							<div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
								{scenarios.map((s) => {
									const isAssigned = assignedScenarios.some((a) => a.scenario_id === s.id);
									return (
										<div
											key={s.id}
											onClick={() => toggleScenario(s.id)}
											className={`cursor-pointer p-3 rounded-lg shadow-sm transition flex justify-between items-center ${
												isAssigned ? "bg-green-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
											}`}
										>
											<div>
												<div className="font-semibold">{s.title}</div>
												<div className="text-sm text-gray-500 mt-1 line-clamp-2">{s.content}</div>
											</div>
											<div className="ml-4">
												<span className={`px-3 py-1 rounded-full text-sm ${isAssigned ? "bg-white text-green-600" : "bg-white text-gray-600"}`}>
													{isAssigned ? "Assigned" : "Assign"}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>

					{/* Tip */}
					<div className="text-sm text-gray-600">Tip: click a scenario to toggle assignment for the selected user.</div>
				</main>
			</div>
		</div>
	);
}
