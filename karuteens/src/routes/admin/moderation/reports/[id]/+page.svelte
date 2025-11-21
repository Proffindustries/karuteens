<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { 
    AlertTriangle, 
    User, 
    MessageSquare, 
    Shield, 
    ArrowLeft,
    Check,
    X,
    Eye,
    EyeOff,
    Ban,
    Mail,
    Clock
  } from 'lucide-svelte';

  // State variables
  let loading = true;
  let isAuthorized = false;
  let report: any = null;
  let reporter: any = null;
  let targetData: any = null;
  let enforcementActions: any[] = [];
  let actionType = 'warn';
  let actionReason = '';
  let actionDescription = '';
  let actionSubmitting = false;

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
    
    await loadReport();
    loading = false;
  });

  // Load report data
  async function loadReport() {
    try {
      const reportId = $page.params.id;
      
      // Load report with reporter data
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(id, username, avatar_url, full_name, email)
        `)
        .eq('id', reportId)
        .single();
        
      if (reportError) throw reportError;
      
      report = reportData;
      reporter = reportData.reporter;
      
      // Load enforcement actions for this report
      const { data: actionsData, error: actionsError } = await supabase
        .from('enforcement_actions')
        .select(`
          *,
          moderator:profiles!enforcement_actions_moderator_id_fkey(id, username, avatar_url)
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });
        
      if (actionsError) throw actionsError;
      
      enforcementActions = actionsData || [];
      
      // Load target data based on report type
      if (report.target_id) {
        await loadTargetData();
      }
    } catch (error) {
      console.error('Error loading report:', error);
    }
  }

  // Load target data based on report type
  async function loadTargetData() {
    try {
      // This would be expanded based on the actual content types in your system
      // For now, we'll just set a placeholder
      targetData = {
        id: report.target_id,
        type: report.report_type,
        title: `Content ID: ${report.target_id}`,
        url: `/content/${report.target_id}`
      };
    } catch (error) {
      console.error('Error loading target data:', error);
    }
  }

  // Update report status
  async function updateReportStatus(status: string) {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', report.id);
        
      if (error) throw error;
      
      // Update local state
      report.status = status;
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Failed to update report status');
    }
  }

  // Submit enforcement action
  async function submitEnforcementAction() {
    if (!actionType || !actionReason) {
      alert('Please select an action type and provide a reason');
      return;
    }
    
    actionSubmitting = true;
    
    try {
      // Check if user is available
      if (!$user) {
        throw new Error('User not authenticated');
      }
      
      // Create enforcement action
      const { data: actionData, error: actionError } = await supabase
        .from('enforcement_actions')
        .insert({
          report_id: report.id,
          moderator_id: $user.id,
          action_type: actionType,
          target_type: report.report_type,
          target_id: report.target_id || report.id,
          reason: actionReason,
          description: actionDescription
        })
        .select()
        .single();
        
      if (actionError) throw actionError;
      
      // Add to local actions list
      enforcementActions = [actionData, ...enforcementActions];
      
      // Update report status to resolved
      await updateReportStatus('resolved');
      
      // Reset form
      actionType = 'warn';
      actionReason = '';
      actionDescription = '';
      
      // Show success message
      alert('Enforcement action submitted successfully');
    } catch (error) {
      console.error('Error submitting enforcement action:', error);
      alert('Failed to submit enforcement action');
    } finally {
      actionSubmitting = false;
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
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      case 'appealed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Get action type class
  function getActionClass(actionType: string) {
    switch (actionType) {
      case 'warn': return 'bg-yellow-100 text-yellow-800';
      case 'suspend': return 'bg-orange-100 text-orange-800';
      case 'ban': return 'bg-red-100 text-red-800';
      case 'delete_content': return 'bg-red-100 text-red-800';
      case 'hide_content': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<main class="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
  <div class="flex items-center gap-4">
    <a href="/admin/moderation" class="p-2 rounded-lg hover:bg-gray-100">
      <ArrowLeft class="size-5" />
    </a>
    <h1 class="text-3xl font-bold">Report Details</h1>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !isAuthorized}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle class="size-12 text-red-600 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
      <p class="text-red-700">You don't have permission to view this report.</p>
    </div>
  {:else if !report}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle class="size-12 text-red-600 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-red-900 mb-2">Report Not Found</h2>
      <p class="text-red-700">The requested report could not be found.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Report Details -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-xl shadow p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-xl font-semibold">Report Information</h2>
            <span class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(report.status)}`}>
              {report.status}
            </span>
          </div>
          
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-500">Report Type</h3>
              <p class="text-lg capitalize">{report.report_type}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Reason</h3>
              <p class="text-lg">{report.reason}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Description</h3>
              <p class="text-gray-900 whitespace-pre-wrap">{report.description}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Reported At</h3>
              <p class="text-gray-900">{formatDate(report.created_at)}</p>
            </div>
            
            {#if report.target_id}
              <div>
                <h3 class="text-sm font-medium text-gray-500">Target ID</h3>
                <p class="text-gray-900 font-mono">{report.target_id}</p>
              </div>
            {/if}
          </div>
        </div>
        
        {#if targetData}
          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Reported Content</h2>
            
            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div class="flex-1">
                <h3 class="font-medium">{targetData.title}</h3>
                <p class="text-sm text-gray-600">{targetData.type}</p>
              </div>
              <a 
                href={targetData.url} 
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                View Content
              </a>
            </div>
          </div>
        {/if}
        
        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Reporter Information</h2>
          
          <div class="flex items-center gap-4">
            <img 
              src={reporter?.avatar_url || `https://ui-avatars.com/api/?name=${reporter?.username || 'U'}`} 
              alt={reporter?.username} 
              class="size-16 rounded-full"
            />
            <div>
              <h3 class="text-lg font-medium">{reporter?.full_name || reporter?.username || 'Unknown User'}</h3>
              <p class="text-gray-600">{reporter?.username}</p>
              {#if reporter?.email}
                <p class="text-gray-600 text-sm">{reporter.email}</p>
              {/if}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Panel -->
      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Take Action</h2>
          
          <div class="space-y-4">
            <div>
              <label for="action-type" class="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select 
                id="action-type"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                bind:value={actionType}
              >
                <option value="warn">Send Warning</option>
                <option value="hide_content">Hide Content</option>
                <option value="delete_content">Delete Content</option>
                <option value="suspend">Suspend Account</option>
                <option value="ban">Ban Account</option>
              </select>
            </div>
            
            <div>
              <label for="action-reason" class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <input 
                type="text" 
                id="action-reason"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter reason for action"
                bind:value={actionReason}
              />
            </div>
            
            <div>
              <label for="action-description" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea 
                id="action-description"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Additional details about the action"
                bind:value={actionDescription}
              ></textarea>
            </div>
            
            <button
              class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={actionSubmitting}
              on:click={submitEnforcementAction}
            >
              {actionSubmitting ? 'Submitting...' : 'Submit Action'}
            </button>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
          
          <div class="space-y-3">
            {#if report.status === 'pending'}
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                on:click={() => updateReportStatus('resolved')}
              >
                <Check class="size-4" />
                Mark as Resolved
              </button>
              
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                on:click={() => updateReportStatus('dismissed')}
              >
                <X class="size-4" />
                Dismiss Report
              </button>
            {/if}
            
            <button
              class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              on:click={() => updateReportStatus('reviewing')}
            >
              <Clock class="size-4" />
              Mark as Reviewing
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Enforcement Actions History -->
    {#if enforcementActions.length > 0}
      <div class="bg-white rounded-xl shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Enforcement Actions</h2>
        
        <div class="space-y-4">
          {#each enforcementActions as action}
            <div class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-start justify-between">
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
                <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionClass(action.action_type)}`}>
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
  {/if}
</main>