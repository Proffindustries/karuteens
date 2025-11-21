<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { 
    AlertTriangle, 
    ArrowLeft,
    Check,
    X,
    Clock,
    User,
    MessageSquare
  } from 'lucide-svelte';

  // State variables
  let loading = true;
  let isAuthorized = false;
  let appeal: any = null;
  let userAppealing: any = null;
  let relatedReport: any = null;
  let relatedEnforcementActions: any[] = [];
  let decision = '';
  let notes = '';
  let decisionSubmitting = false;

  // Check authorization and load data on mount
  onMount(async () => {
    if (!$user) {
      window.location.href = '/auth/sign-in';
      return;
    }

    // Check if user is admin/moderator
    const ADMIN_EMAIL = import.meta.env.PUBLIC_ADMIN_EMAIL;
    const ADMIN_USER_ID = import.meta.env.PUBLIC_ADMIN_USER_ID;
    const emailOk = ADMIN_EMAIL && $user.email && $user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const idOk = ADMIN_USER_ID && $user.id === ADMIN_USER_ID;
    isAuthorized = Boolean(emailOk || idOk);
    
    if (!isAuthorized) {
      window.location.href = '/';
      return;
    }
    
    await loadAppeal();
    loading = false;
  });

  // Load appeal data
  async function loadAppeal() {
    try {
      const appealId = $page.params.id;
      
      // Load appeal with user data
      const { data: appealData, error: appealError } = await supabase
        .from('appeals')
        .select(`
          *,
          user:profiles!appeals_user_id_fkey(id, username, avatar_url, full_name, email)
        `)
        .eq('id', appealId)
        .single();
        
      if (appealError) throw appealError;
      
      appeal = appealData;
      userAppealing = appealData.user;
      
      // Load related report
      if (appeal.report_id) {
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('*')
          .eq('id', appeal.report_id)
          .single();
          
        if (!reportError) {
          relatedReport = reportData;
        }
        
        // Load enforcement actions for this report
        const { data: actionsData, error: actionsError } = await supabase
          .from('enforcement_actions')
          .select(`
            *,
            moderator:profiles!enforcement_actions_moderator_id_fkey(id, username, avatar_url)
          `)
          .eq('report_id', appeal.report_id)
          .order('created_at', { ascending: false });
          
        if (!actionsError) {
          relatedEnforcementActions = actionsData || [];
        }
      }
    } catch (error) {
      console.error('Error loading appeal:', error);
    }
  }

  // Update appeal status
  async function updateAppealStatus(status: string) {
    if (status === 'approved' || status === 'rejected') {
      if (!decision) {
        alert('Please provide a decision reason');
        return;
      }
    }
    
    decisionSubmitting = true;
    
    try {
      const { error } = await supabase
        .from('appeals')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', appeal.id);
        
      if (error) throw error;
      
      // Update local state
      appeal.status = status;
      
      // If approved, we might want to reverse the enforcement action
      if (status === 'approved') {
        // In a real implementation, you would reverse the enforcement action here
        // For example, unban a user, restore deleted content, etc.
      }
      
      // Show success message
      alert(`Appeal ${status} successfully`);
    } catch (error) {
      console.error('Error updating appeal status:', error);
      alert('Failed to update appeal status');
    } finally {
      decisionSubmitting = false;
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

<main class="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
  <div class="flex items-center gap-4">
    <a href="/admin/moderation" class="p-2 rounded-lg hover:bg-gray-100">
      <ArrowLeft class="size-5" />
    </a>
    <h1 class="text-3xl font-bold">Appeal Review</h1>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !isAuthorized}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle class="size-12 text-red-600 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
      <p class="text-red-700">You don't have permission to review this appeal.</p>
    </div>
  {:else if !appeal}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle class="size-12 text-red-600 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-red-900 mb-2">Appeal Not Found</h2>
      <p class="text-red-700">The requested appeal could not be found.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Appeal Details -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-xl shadow p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-xl font-semibold">Appeal Information</h2>
            <span class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(appeal.status)}`}>
              {appeal.status}
            </span>
          </div>
          
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-500">Reason</h3>
              <p class="text-lg">{appeal.reason}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Description</h3>
              <p class="text-gray-900 whitespace-pre-wrap">{appeal.description}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Submitted At</h3>
              <p class="text-gray-900">{formatDate(appeal.created_at)}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Last Updated</h3>
              <p class="text-gray-900">{formatDate(appeal.updated_at)}</p>
            </div>
          </div>
        </div>
        
        {#if relatedReport}
          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Related Report</h2>
            
            <div class="space-y-3">
              <div>
                <h3 class="text-sm font-medium text-gray-500">Report Type</h3>
                <p class="capitalize">{relatedReport.report_type}</p>
              </div>
              
              <div>
                <h3 class="text-sm font-medium text-gray-500">Reason</h3>
                <p>{relatedReport.reason}</p>
              </div>
              
              <div>
                <h3 class="text-sm font-medium text-gray-500">Description</h3>
                <p class="text-gray-900">{relatedReport.description}</p>
              </div>
              
              <div>
                <h3 class="text-sm font-medium text-gray-500">Status</h3>
                <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(relatedReport.status)}`}>
                  {relatedReport.status}
                </span>
              </div>
            </div>
          </div>
        {/if}
        
        {#if relatedEnforcementActions.length > 0}
          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Enforcement Actions Taken</h2>
            
            <div class="space-y-4">
              {#each relatedEnforcementActions as action}
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <img 
                        src={action.moderator?.avatar_url || `https://ui-avatars.com/api/?name=${action.moderator?.username || 'M'}`} 
                        alt={action.moderator?.username} 
                        class="size-8 rounded-full"
                      />
                      <div>
                        <h3 class="font-medium">{action.moderator?.username || 'Unknown Moderator'}</h3>
                        <p class="text-sm text-gray-600">{formatDate(action.created_at)}</p>
                      </div>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {action.action_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div class="mt-3 ml-11">
                    <p class="font-medium">{action.reason}</p>
                    {#if action.description}
                      <p class="text-gray-700 mt-1">{action.description}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      
      <!-- User Information and Decision Panel -->
      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-xl font-semibold mb-4">User Information</h2>
          
          <div class="flex items-center gap-4">
            <img 
              src={userAppealing?.avatar_url || `https://ui-avatars.com/api/?name=${userAppealing?.username || 'U'}`} 
              alt={userAppealing?.username} 
              class="size-16 rounded-full"
            />
            <div>
              <h3 class="text-lg font-medium">{userAppealing?.full_name || userAppealing?.username || 'Unknown User'}</h3>
              <p class="text-gray-600">{userAppealing?.username}</p>
              {#if userAppealing?.email}
                <p class="text-gray-600 text-sm">{userAppealing.email}</p>
              {/if}
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Review Appeal</h2>
          
          <div class="space-y-4">
            <div>
              <label for="decision-notes" class="block text-sm font-medium text-gray-700 mb-1">Decision *</label>
              <textarea 
                id="decision-notes"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Explain your decision (required for approve/reject)"
                bind:value={notes}
              ></textarea>
            </div>
            
            <div class="space-y-3">
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={decisionSubmitting}
                on:click={() => updateAppealStatus('approved')}
              >
                <Check class="size-4" />
                Approve Appeal
              </button>
              
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={decisionSubmitting}
                on:click={() => updateAppealStatus('rejected')}
              >
                <X class="size-4" />
                Reject Appeal
              </button>
              
              {#if appeal.status === 'pending'}
                <button
                  class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={decisionSubmitting}
                  on:click={() => updateAppealStatus('reviewing')}
                >
                  <Clock class="size-4" />
                  Mark as Reviewing
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>