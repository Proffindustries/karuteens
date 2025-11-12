<script lang="ts">
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { AlertTriangle, User, MessageSquare, Image as ImageIcon, X } from 'lucide-svelte';

  let reportType = 'user';
  let targetId = '';
  let reason = '';
  let description = '';
  let submitting = false;
  let success = false;

  const reasons = {
    user: ['Harassment', 'Spam', 'Inappropriate Content', 'Impersonation', 'Other'],
    content: ['Violent Content', 'Hate Speech', 'Nudity/Sexual Content', 'Misinformation', 'Copyright Violation', 'Other'],
    technical: ['Bug/Error', 'Performance Issue', 'Feature Request', 'Security Concern', 'Other']
  };

  async function submitReport() {
    if (!$user) {
      window.location.href = '/auth/sign-in';
      return;
    }
    
    if (!reason || !description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    submitting = true;

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: $user.id,
        report_type: reportType,
        target_id: targetId || null,
        reason,
        description: description.trim(),
        status: 'pending'
      });

    if (error) {
      alert(error.message);
      submitting = false;
      return;
    }

    success = true;
    submitting = false;
    
    // Reset form after 3 seconds
    setTimeout(() => {
      success = false;
      targetId = '';
      reason = '';
      description = '';
    }, 3000);
  }
</script>

<main class="max-w-screen-md mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <div class="inline-flex items-center justify-center size-16 rounded-full bg-red-100 mb-4">
      <AlertTriangle class="size-8 text-red-600" />
    </div>
    <h1 class="text-4xl font-black">Report Center</h1>
    <p class="text-foreground/70">Help us keep the community safe by reporting issues</p>
  </div>

  {#if success}
    <div class="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
      <div class="inline-flex items-center justify-center size-16 rounded-full bg-green-100 mb-4">
        <svg class="size-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-green-900 mb-2">Report Submitted</h2>
      <p class="text-green-700">Thank you for helping us maintain a safe community. Our moderation team will review your report within 24 hours.</p>
    </div>
  {:else}
    <div class="bg-white rounded-2xl shadow-xl p-8 space-y-6">
      <div>
        <label class="block text-sm font-semibold mb-3">What would you like to report?</label>
        <div class="grid md:grid-cols-3 gap-3">
          <button 
            class="p-4 rounded-xl border-2 transition-all {reportType === 'user' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-red-300'}"
            on:click={() => reportType = 'user'}
          >
            <User class="size-6 mx-auto mb-2 {reportType === 'user' ? 'text-red-600' : 'text-foreground/60'}" />
            <p class="font-medium text-sm">User</p>
          </button>
          <button 
            class="p-4 rounded-xl border-2 transition-all {reportType === 'content' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-red-300'}"
            on:click={() => reportType = 'content'}
          >
            <MessageSquare class="size-6 mx-auto mb-2 {reportType === 'content' ? 'text-red-600' : 'text-foreground/60'}" />
            <p class="font-medium text-sm">Content</p>
          </button>
          <button 
            class="p-4 rounded-xl border-2 transition-all {reportType === 'technical' ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-red-300'}"
            on:click={() => reportType = 'technical'}
          >
            <AlertTriangle class="size-6 mx-auto mb-2 {reportType === 'technical' ? 'text-red-600' : 'text-foreground/60'}" />
            <p class="font-medium text-sm">Technical Issue</p>
          </button>
        </div>
      </div>

      {#if reportType !== 'technical'}
        <div>
          <label class="block text-sm font-semibold mb-2">{reportType === 'user' ? 'User' : 'Content'} ID or Link (Optional)</label>
          <input 
            class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent" 
            bind:value={targetId}
            placeholder="Paste the link or ID here"
          />
        </div>
      {/if}

      <div>
        <label class="block text-sm font-semibold mb-2">Reason *</label>
        <select 
          class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          bind:value={reason}
        >
          <option value="">Select a reason</option>
          {#each reasons[reportType] as r}
            <option value={r}>{r}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-sm font-semibold mb-2">Description *</label>
        <textarea 
          class="w-full rounded-lg border border-gray-300 px-4 py-3 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
          rows="6"
          bind:value={description}
          placeholder="Please provide as much detail as possible to help us investigate..."
        />
        <p class="text-xs text-foreground/60 mt-1">{description.length}/500 characters</p>
      </div>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-sm text-yellow-800">
          <strong>Note:</strong> False reports may result in account suspension. All reports are confidential and reviewed by our moderation team.
        </p>
      </div>

      <button 
        class="w-full px-6 py-4 rounded-lg bg-red-600 text-white font-bold text-lg hover:bg-red-700 disabled:opacity-50 transition-all"
        on:click={submitReport}
        disabled={submitting || !reason || !description.trim()}
      >
        {submitting ? 'Submitting Report...' : 'Submit Report'}
      </button>
    </div>
  {/if}

  <div class="bg-blue-50 border border-blue-200 rounded-2xl p-6">
    <h3 class="font-bold mb-2">Need Immediate Help?</h3>
    <p class="text-sm text-foreground/70 mb-4">If you're in immediate danger or need urgent assistance:</p>
    <div class="space-y-2 text-sm">
      <p>• <strong>Emergency Services:</strong> 999 / 112</p>
      <p>• <strong>Campus Security:</strong> Available 24/7</p>
      <p>• <a href="/safety" class="text-blue-600 hover:underline">Visit our Safety Center</a> for mental health resources</p>
    </div>
  </div>
</main>
