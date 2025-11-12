<script lang="ts">
  type Resource = { id: number; subject: string; title: string; year: number };
  let resources: Resource[] = [
    { id: 1, subject: 'Math', title: 'MTH101 Past Paper', year: 2023 },
    { id: 2, subject: 'Chemistry', title: 'CHE102 Revision Guide', year: 2022 }
  ];
</script>

<main class="max-w-screen-sm mx-auto px-4 py-6 space-y-4">
  <h1 class="text-2xl font-semibold">Exam Resources</h1>

  <section class="rounded-xl border bg-white p-3 space-y-2">
    <input class="w-full rounded-md border px-3 py-2" placeholder="Search resources" />
    <div class="grid gap-3">
      {#each resources as r}
        <article class="rounded-xl border bg-white p-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">{r.title}</div>
              <div class="text-xs text-foreground/60">{r.subject} • {r.year}</div>
            </div>
            <a href="#" class="text-blue-700 underline text-sm">View</a>
          </div>
        </article>
      {/each}
    </div>
  </section>
</main>
