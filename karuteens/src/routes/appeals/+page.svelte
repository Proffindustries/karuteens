<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { 
    RefreshCw, 
    AlertTriangle,
    CheckCircle,
    Clock,
    XCircle
  } from 'lucide-svelte';

  // State variables
  let loading = true;
  let userAppeals: any[] = [];
  let showNewAppealForm = false;
  let selectedReportId = '';
  let appealReason = '';
  let appealDescription = '';
  let submitting = false;
  let reportsAvailableForAppeal: any[] = [];

  // Load data on mount
  onMount(async () => {
    if (!$user) {
      window.location.href = '/auth/sign-in';
      return;
    }
    
    await Promise.all([
      loadUserAppeals(),
      loadReportsForAppeal()
    ]);
    
    loading = false;
  });

  // Load user's appeals
  async function loadUserAppeals() {
    if (!$user) return;
    
    try {
      const { data, error } = await supabase
        .from('appeals')
        .select(`
          *,
          report:reports!appeals_report_id_fkey(id, reason, description)
        `)
        .eq('user_id', $user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      userAppeals = data || [];
    } catch (error) {
      console.error('Error loading appeals:', error);
    }
  }

  // Load reports that can be appealed
  async function loadReportsForAppeal() {
    if (!$user) return;
    
    try {
      // Load reports where the user is the reporter and status is resolved or dismissed
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', $user.id)
        .in('status', ['resolved', 'dismissed'])
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      reportsAvailableForAppeal = data || [];
    } catch (error) {
      console.error('Error loading reports for appeal:', error);
    }
  }

  // Submit new appeal
  async function submitAppeal() {
    if (!selectedReportId || !appealReason || !appealDescription || !$user) {
      alert('Please fill in all required fields');
      return;
    }
    
    submitting = true;
    
    try {
      const { data, error } = await supabase
        .from('appeals')
        .insert({
          report_id: selectedReportId,
          user_id: $user.id,
          reason: appealReason,
          description: appealDescription.trim()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Add to local list
      userAppeals = [data, ...userAppeals];
      
      // Reset form
      selectedReportId = '';
      appealReason = '';
      appealDescription = '';
      showNewAppealForm = false;
      
      // Show success message
      alert('Appeal submitted successfully');
    } catch (error) {
      console.error('Error submitting appeal:', error);
      alert('Failed to submit appeal');
    } finally {
      submitting = false;
    }
  }

  // Format date
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get status badge class
  function getStatusClass(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewing': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<main class="max-w-screen-lg mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <div class="inline-flex items-center justify-center size-16 rounded-full bg-blue-100 mb-4">
      <RefreshCw class="size-8 text-blue-600" />
    </div>
    <h1 class="text-4xl font-black">Appeals Center</h1>
    <p class="text-foreground/70 max-w-2xl mx-auto">
      If you believe a moderation decision was incorrect, you can submit an appeal for review by our team.
    </p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !$user}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle class="size-12 text-red-600 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-red-900 mb-2">Authentication Required</h2>
      <p class="text-red-700">You must be logged in to view or submit appeals.</p>
      <a href="/auth/sign-in" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Sign In
      </a>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- User Appeals -->
      <div class="lg:col-span-2 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Your Appeals</h2>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            on:click={() => showNewAppealForm = true}
            disabled={reportsAvailableForAppeal.length === 0}
          >
            <RefreshCw class="size-4" />
            New Appeal
          </button>
        </div>
        
        {#if userAppeals.length === 0}
          <div class="bg-gray-50 rounded-2xl p-8 text-center">
            <RefreshCw class="size-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-1">No appeals yet</h3>
            <p class="text-gray-500">You haven't submitted any appeals. If you have a report that was resolved or dismissed, you can appeal the decision.</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each userAppeals as appeal}
              <div class="bg-white rounded-2xl shadow p-6 border">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h3 class="font-semibold">{appeal.reason}</h3>
                    <p class="text-sm text-gray-600">Submitted {formatDate(appeal.created_at)}</p>
                  </div>
                  <span class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(appeal.status)}`}>
                    {appeal.status}
                  </span>
                </div>
                
                <div class="space-y-3">
                  <div>
                    <h4 class="text-sm font-medium text-gray-500">Description</h4>
                    <p class="text-gray-900">{appeal.description}</p>
                  </div>
                  
                  {#if appeal.report}
                    <div class="bg-gray-50 rounded-lg p-4">
                      <h4 class="text-sm font-medium text-gray-500 mb-2">Related Report</h4>
                      <p class="text-sm"><strong>Reason:</strong> {appeal.report.reason}</p>
                      <p class="text-sm mt-1"><strong>Description:</strong> {appeal.report.description}</p>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- New Appeal Form -->
      <div class="space-y-6">
        {#if showNewAppealForm}
          <div class="bg-white rounded-2xl shadow p-6 sticky top-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold">Submit New Appeal</h2>
              <button 
                class="p-2 hover:bg-gray-100 rounded-lg"
                on:click={() => showNewAppealForm = false}
              >
                <XCircle class="size-5" />
              </button>
            </div>
            
            <div class="space-y-4">
              <div>
                <label for="report-to-appeal" class="block text-sm font-medium text-gray-700 mb-1">Report to Appeal *</label>
                <select 
                  id="report-to-appeal"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  bind:value={selectedReportId}
                >
                  <option value="">Select a report</option>
                  {#each reportsAvailableForAppeal as report}
                    <option value={report.id}>Report #{report.id.substring(0, 8)} - {report.reason}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label for="appeal-reason" class="block text-sm font-medium text-gray-700 mb-1">Reason for Appeal *</label>
                <select 
                  id="appeal-reason"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  bind:value={appealReason}
                >
                  <option value="">Select a reason</option>
                  <option value="Misunderstanding">Misunderstanding of the situation</option>
                  <option value="Incorrect information">Incorrect information in the report</option>
                  <option value="Changed circumstances">Circumstances have changed</option>
                  <option value="Procedural error">Procedural error in moderation</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label for="detailed-explanation" class="block text-sm font-medium text-gray-700 mb-1">Detailed Explanation *</label>
                <textarea 
                  id="detailed-explanation"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Explain why you believe the moderation decision should be reconsidered..."
                  bind:value={appealDescription}
                ></textarea>
                <p class="text-xs text-gray-500 mt-1">{appealDescription.length}/1000 characters</p>
              </div>
              
              <button
                class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={submitting || !selectedReportId || !appealReason || !appealDescription.trim()}
                on:click={submitAppeal}
              >
                {submitting ? 'Submitting...' : 'Submit Appeal'}
              </button>
            </div>
          </div>
        {/if}
        
        <div class="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 class="font-bold mb-2">Appeals Process</h3>
          <ul class="text-sm text-blue-800 space-y-2">
            <li class="flex items-start gap-2">
              <CheckCircle class="size-4 mt-0.5 flex-shrink-0" />
              <span>Appeals are reviewed by our moderation team within 48 hours</span>
            </li>
            <li class="flex items-start gap-2">
              <Clock class="size-4 mt-0.5 flex-shrink-0" />
              <span>You'll receive a notification when a decision is made</span>
            </li>
            <li class="flex items-start gap-2">
              <AlertTriangle class="size-4 mt-0.5 flex-shrink-0" />
              <span>Decisions on appeals are final and cannot be appealed again</span>
            </li>
          </ul>
        </div>
        
        {#if reportsAvailableForAppeal.length === 0 && !showNewAppealForm}
          <div class="bg-gray-50 rounded-2xl p-6 text-center">
            <RefreshCw class="size-8 text-gray-400 mx-auto mb-3" />
            <h3 class="font-medium text-gray-900 mb-1">No Reports to Appeal</h3>
            <p class="text-sm text-gray-600">You don't have any reports that can be appealed at this time.</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</main>