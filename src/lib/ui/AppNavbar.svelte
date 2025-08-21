<script lang="ts">
  import { page } from "$app/state";

  type Link = { href: string; label: string };
  const links: Link[] = [
    { href: "/", label: "Calcs" },
    { href: "/gears", label: "Gears" },
    { href: "/relics", label: "Relics" },
    { href: "/constellations", label: "Constellations" },
    { href: "/bells", label: "Bells" },
    { href: "/config", label: "Config" },
  ];

  // runes state
  let currentPath = page.url.pathname;

  const isActive = (href: string) =>
    currentPath === href || currentPath.startsWith(href + "/");
</script>

<nav class="navbar bg-base-100 rounded-2xl shadow-md px-4">
  <div class="flex-1">
    <a href="/" class="btn btn-ghost text-xl">Hell Clock Planner</a>
  </div>

  <!-- desktop tabs -->
  <div class="flex-none hidden md:block">
    <div role="tablist" class="tabs tabs-boxed">
      {#each links as { href, label }}
        <a
          role="tab"
          {href}
          class={`tab ${isActive(href) ? "tab-active" : ""}`}
          aria-current={isActive(href) ? "page" : undefined}
        >
          {label}
        </a>
      {/each}
    </div>
  </div>

  <!-- mobile dropdown -->
  <div class="flex-none md:hidden">
    <details class="dropdown dropdown-end">
      <summary class="btn btn-ghost" aria-label="Open menu">Menu</summary>
      <ul
        class="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
      >
        {#each links as { href, label }}
          <li>
            <a
              {href}
              class={isActive(href) ? "active" : ""}
              aria-current={isActive(href) ? "page" : undefined}
            >
              {label}
            </a>
          </li>
        {/each}
      </ul>
    </details>
  </div>
</nav>
