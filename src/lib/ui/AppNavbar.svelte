<script lang="ts">
  let githubUrl = "https://github.com/justjuangui/hellclock-calculator-ui";
</script>

<nav class="navbar bg-base-100 rounded-2xl shadow-md px-2">
  <div class="flex-1">
    <a href="/" class="btn btn-ghost text-xl">Hell Clock Planner</a>
  </div>
  <div class="gap-2">
    <!-- GitHub link -->
    <a
      class="btn btn-ghost gap-2"
      href={githubUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open GitHub"
    >
      <!-- GitHub icon -->
      <svg
        class="w-5 h-5"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M12 .5A11.5 11.5 0 0 0 .5 12.3c0 5.25 3.4 9.7 8.12 11.27.6.1.82-.27.82-.58
             0-.28-.01-1.02-.02-2-3.3.73-4-1.6-4-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.1-.77.08-.75.08-.75
             1.22.09 1.86 1.27 1.86 1.27 1.08 1.89 2.83 1.34 3.52 1.02.11-.8.42-1.34.76-1.65-2.64-.31-5.42-1.36-5.42-6.06
             0-1.34.47-2.43 1.24-3.28-.12-.31-.54-1.57.12-3.27 0 0 1.01-.33 3.3 1.25a11.2 11.2 0 0 1 6 0
             c2.29-1.58 3.3-1.25 3.3-1.25.66 1.7.24 2.96.12 3.27.78.85 1.24 1.94 1.24 3.28
             0 4.72-2.78 5.74-5.43 6.05.43.37.81 1.1.81 2.22 0 1.6-.02 2.89-.02 3.29 0 .32.22.69.83.57A11.51 11.51 0 0 0 23.5 12.3
             11.5 11.5 0 0 0 12 .5z"
        />
      </svg>
      <span class="hidden sm:inline">GitHub</span>
    </a>
  </div>
</nav>
