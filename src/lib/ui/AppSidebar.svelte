<script lang="ts">
	type NavItem = {
		id: string;
		label: string;
		icon: string;
		badge?: string;
		disabled?: boolean;
	};

	let {
		activeSection = $bindable('home'),
		collapsed = $bindable(false)
	} = $props<{
		activeSection: string;
		collapsed: boolean;
	}>();

	const navItems: NavItem[] = [
		{ id: 'home', label: 'Home', icon: '🏠' },
		{ id: 'stats', label: 'Stats', icon: '📊' },
		{ id: 'gear', label: 'Gear', icon: '⚔️' },
		{ id: 'skills', label: 'Skills', icon: '✨' },
		{ id: 'relics', label: 'Relics', icon: '💎' },
		{ id: 'constellation', label: 'Constellation', icon: '🌟' },
		{ id: 'bell', label: 'Bell', icon: '🔔', disabled: true },
		{ id: 'blessing', label: 'Blessing', icon: '🙏', disabled: true }
	];
</script>

<aside
	class="fixed left-0 top-0 bottom-0 bg-base-200 border-r border-base-300 transition-all duration-300 ease-in-out flex flex-col z-30 overflow-hidden"
	class:w-[200px]={!collapsed}
	class:w-16={collapsed}
>
	<!-- Sidebar Header -->
	<div class="border-b border-base-300" class:p-4={!collapsed} class:p-2={collapsed}>
		{#if !collapsed}
			<h2 class="text-lg font-bold">Hell Clock Calculator</h2>
		{:else}
			<div class="text-2xl text-center flex justify-center">
				<span class="w-8 flex-shrink-0">🕰️</span>
			</div>
		{/if}
	</div>

	<!-- Navigation Items -->
	<nav class="flex-1 overflow-y-auto overflow-x-hidden py-2">
		<ul class="menu menu-vertical gap-1 px-2">
			{#each navItems as item}
				<li>
					<button
						class="flex items-center rounded-lg transition-colors"
						class:gap-3={!collapsed}
						class:gap-1={collapsed}
						class:bg-primary={activeSection === item.id && !item.disabled}
						class:text-primary-content={activeSection === item.id && !item.disabled}
						class:hover:bg-base-300={activeSection !== item.id && !item.disabled}
						class:opacity-50={item.disabled}
						class:cursor-not-allowed={item.disabled}
						class:justify-center={collapsed}
						disabled={item.disabled}
						onclick={() => !item.disabled && (activeSection = item.id)}
						title={collapsed ? item.label : ''}
					>
						<span class="text-xl w-6 flex-shrink-0 flex justify-center">{item.icon}</span>
						{#if !collapsed}
							<span class="flex-1 text-left">{item.label}</span>
							{#if item.badge}
								<span class="badge badge-sm">{item.badge}</span>
							{/if}
							{#if item.disabled}
								<span class="text-xs opacity-60">Soon</span>
							{/if}
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- GitHub Link -->
	<div class="border-t border-base-300">
		<a
			href="https://github.com/justjuangui/hellclock-calculator-ui"
			target="_blank"
			rel="noopener noreferrer"
			class="w-full flex items-center hover:bg-base-300 transition-colors text-base-content no-underline"
			class:p-4={!collapsed}
			class:p-2={collapsed}
			class:gap-3={!collapsed}
			class:justify-center={collapsed}
			title="Open GitHub"
		>
			<span class="text-xl w-6 flex-shrink-0 flex justify-center">🔗</span>
			{#if !collapsed}
				<span class="flex-1 text-left text-sm">GitHub</span>
			{/if}
		</a>
	</div>

	<!-- Collapse Toggle -->
	<div class="border-t border-base-300">
		<button
			class="w-full flex items-center hover:bg-base-300 transition-colors"
			class:p-4={!collapsed}
			class:p-2={collapsed}
			class:gap-3={!collapsed}
			class:justify-center={collapsed}
			onclick={() => (collapsed = !collapsed)}
			title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			<span class="text-xl w-6 flex-shrink-0 flex justify-center">{collapsed ? '→' : '←'}</span>
			{#if !collapsed}
				<span class="flex-1 text-left text-sm">Collapse</span>
			{/if}
		</button>
	</div>
</aside>
