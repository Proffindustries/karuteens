<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { 
    AlertTriangle, 
    User, 
    MessageSquare, 
    Shield, 
    Clock, 
    CheckCircle, 
    XCircle, 
    Eye, 
    EyeOff, 
    Ban, 
    AlertOctagon,
    RefreshCw,
    Filter,
    Search
  } from 'lucide-svelte';

  // State variables
  let loading = true;
  let isAuthorized = false;
  let activeTab = 'reports';
  let reports: any[] = [];
  let enforcementActions: any[] = [];
  let appeals: any[] = [];
  let autoFlags: any[] = [];
  
  // Filter states
  let reportStatus = 'pending';
  let reportType = 'all';
  let flagStatus = 'pending';
  let appealStatus = 'pending';
  
  // Stats
  let stats = {
    pendingReports: 0,
    resolvedReports: 0,
    pendingFlags: 0,
    pendingAppeals: 0
  };

  // Check authorization on mount
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
    
    await loadDashboardData();
    loading = false;
  });

  // Load dashboard data
  async function loadDashboardData() {
    try {
      // Load stats
      const [pendingReportsRes, resolvedReportsRes, pendingFlagsRes, pendingAppealsRes] = await Promise.all([
        supabase.from('reports').select('*', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact' }).eq('status', 'resolved'),
        supabase.from('auto_flags').select('*', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('appeals').select('*', { count: 'exact' }).eq('status', 'pending')
      ]);
      
      stats.pendingReports = pendingReportsRes.count || 0;
      stats.resolvedReports = resolvedReportsRes.count || 0;
      stats.pendingFlags = pendingFlagsRes.count || 0;
      stats.pendingAppeals = pendingAppealsRes.count || 0;
      
      // Load initial data for active tab
      await loadReports();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  // Load reports
  async function loadReports() {
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (reportStatus !== 'all') {
        query = query.eq('status', reportStatus);
      }
      
      if (reportType !== 'all') {
        query = query.eq('report_type', reportType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      reports = data || [];
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }

  // Load enforcement actions
  async function loadEnforcementActions() {
    try {
      const { data, error } = await supabase
        .from('enforcement_actions')
        .select(`
          *,
          moderator:profiles!enforcement_actions_moderator_id_fkey(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      enforcementActions = data || [];
    } catch (error) {
      console.error('Error loading enforcement actions:', error);
    }
  }

  // Load appeals
  async function loadAppeals() {
    try {
      let query = supabase
        .from('appeals')
        .select(`
          *,
          user:profiles!appeals_user_id_fkey(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (appealStatus !== 'all') {
        query = query.eq('status', appealStatus);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      appeals = data || [];
    } catch (error) {
      console.error('Error loading appeals:', error);
    }
  }

  // Load auto flags
  async function loadAutoFlags() {
    try {
      let query = supabase
        .from('auto_flags')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (flagStatus !== 'all') {
        query = query.eq('status', flagStatus);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      autoFlags = data || [];
    } catch (error) {
      console.error('Error loading auto flags:', error);
    }
  }

  // Update report status
  async function updateReportStatus(reportId: string, status: string) {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', reportId);
        
      if (error) throw error;
      
      // Update local state
      reports = reports.map(report => 
        report.id === reportId ? { ...report, status } : report
      );
      
      // Refresh stats
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Failed to update report status');
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

<main class="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold">Moderation Dashboard</h1>
    <button 
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
      on:click={loadDashboardData}
    >
      <RefreshCw class="size-4" />
      Refresh
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !isAuthorized}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertOctagon class="size-12 text-red-600 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
      <p class="text-red-700">You don't have permission to access the moderation dashboard.</p>
    </div>
  {:else}
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Pending Reports</p>
            <p class="text-3xl font-bold">{stats.pendingReports}</p>
          </div>
          <AlertTriangle class="size-8 text-yellow-500" />
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Resolved Reports</p>
            <p class="text-3xl font-bold">{stats.resolvedReports}</p>
          </div>
          <CheckCircle class="size-8 text-green-500" />
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Auto Flags</p>
            <p class="text-3xl font-bold">{stats.pendingFlags}</p>
          </div>
          <Shield class="size-8 text-purple-500" />
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Pending Appeals</p>
            <p class="text-3xl font-bold">{stats.pendingAppeals}</p>
          </div>
          <RefreshCw class="size-8 text-blue-500" />
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex space-x-8">
        <button
          class={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reports' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          on:click={() => { activeTab = 'reports'; loadReports(); }}
        >
          Reports
        </button>
        <button
          class={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'actions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          on:click={() => { activeTab = 'actions'; loadEnforcementActions(); }}
        >
          Enforcement Actions
        </button>
        <button
          class={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'flags' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          on:click={() => { activeTab = 'flags'; loadAutoFlags(); }}
        >
          Auto Flags
        </button>
        <button
          class={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'appeals' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          on:click={() => { activeTab = 'appeals'; loadAppeals(); }}
        >
          Appeals
        </button>
      </nav>
    </div>

    <!-- Reports Tab -->
    {#if activeTab === 'reports'}
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 class="text-xl font-semibold">Reports Queue</h2>
            <div class="flex flex-wrap gap-3">
              <div class="flex items-center gap-2">
                <Filter class="size-4 text-gray-500" />
                <select 
                  class="rounded border-gray-300 text-sm"
                  bind:value={reportStatus}
                  on:change={loadReports}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                  <option value="appealed">Appealed</option>
                </select>
              </div>
              
              <div class="flex items-center gap-2">
                <MessageSquare class="size-4 text-gray-500" />
                <select 
                  class="rounded border-gray-300 text-sm"
                  bind:value={reportType}
                  on:change={loadReports}
                >
                  <option value="all">All Types</option>
                  <option value="user">User</option>
                  <option value="content">Content</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {#if reports.length === 0}
          <div class="p-12 text-center">
            <AlertTriangle class="size-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-1">No reports found</h3>
            <p class="text-gray-500">There are no reports matching your current filters.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporter</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each reports as report}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img 
                          src={report.reporter?.avatar_url || `https://ui-avatars.com/api/?name=${report.reporter?.username || 'U'}`} 
                          alt={report.reporter?.username} 
                          class="size-8 rounded-full mr-3"
                        />
                        <div class="text-sm font-medium text-gray-900">{report.reporter?.username || 'Unknown'}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900 capitalize">{report.report_type}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{report.reason}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-sm text-gray-900 max-w-xs truncate" title={report.description}>{report.description}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.created_at)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center gap-2">
                        {#if report.status === 'pending'}
                          <button 
                            class="text-green-600 hover:text-green-900"
                            on:click={() => updateReportStatus(report.id, 'resolved')}
                          >
                            Resolve
                          </button>
                          <button 
                            class="text-red-600 hover:text-red-900"
                            on:click={() => updateReportStatus(report.id, 'dismissed')}
                          >
                            Dismiss
                          </button>
                        {/if}
                        <button class="text-blue-600 hover:text-blue-900">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Enforcement Actions Tab -->
    {#if activeTab === 'actions'}
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold">Enforcement Actions</h2>
        </div>
        
        {#if enforcementActions.length === 0}
          <div class="p-12 text-center">
            <Shield class="size-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-1">No enforcement actions</h3>
            <p class="text-gray-500">No enforcement actions have been taken yet.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moderator</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each enforcementActions as action}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img 
                          src={action.moderator?.avatar_url || `https://ui-avatars.com/api/?name=${action.moderator?.username || 'M'}`} 
                          alt={action.moderator?.username} 
                          class="size-8 rounded-full mr-3"
                        />
                        <div class="text-sm font-medium text-gray-900">{action.moderator?.username || 'Unknown'}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionClass(action.action_type)}`}>
                        {action.action_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{action.target_type}: {action.target_id}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{action.reason}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(action.created_at)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Auto Flags Tab -->
    {#if activeTab === 'flags'}
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 class="text-xl font-semibold">Auto Flags</h2>
            <div class="flex items-center gap-2">
              <Filter class="size-4 text-gray-500" />
              <select 
                class="rounded border-gray-300 text-sm"
                bind:value={flagStatus}
                on:change={loadAutoFlags}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
        </div>
        
        {#if autoFlags.length === 0}
          <div class="p-12 text-center">
            <Shield class="size-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-1">No auto flags</h3>
            <p class="text-gray-500">No content has been automatically flagged yet.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flag Type</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each autoFlags as flag}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{flag.content_type}: {flag.content_id}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900 capitalize">{flag.flag_type.replace('_', ' ')}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {#if flag.confidence_score}
                        <div class="text-sm text-gray-900">{(flag.confidence_score * 100).toFixed(1)}%</div>
                      {:else}
                        <div class="text-sm text-gray-500">N/A</div>
                      {/if}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(flag.status)}`}>
                        {flag.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(flag.created_at)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Appeals Tab -->
    {#if activeTab === 'appeals'}
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 class="text-xl font-semibold">Appeals</h2>
            <div class="flex items-center gap-2">
              <Filter class="size-4 text-gray-500" />
              <select 
                class="rounded border-gray-300 text-sm"
                bind:value={appealStatus}
                on:change={loadAppeals}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        
        {#if appeals.length === 0}
          <div class="p-12 text-center">
            <RefreshCw class="size-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-1">No appeals</h3>
            <p class="text-gray-500">No appeals have been submitted yet.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each appeals as appeal}
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img 
                          src={appeal.user?.avatar_url || `https://ui-avatars.com/api/?name=${appeal.user?.username || 'U'}`} 
                          alt={appeal.user?.username} 
                          class="size-8 rounded-full mr-3"
                        />
                        <div class="text-sm font-medium text-gray-900">{appeal.user?.username || 'Unknown'}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{appeal.reason}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-sm text-gray-900 max-w-xs truncate" title={appeal.description}>{appeal.description}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(appeal.status)}`}>
                        {appeal.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(appeal.created_at)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button class="text-blue-600 hover:text-blue-900">
                        Review
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</main>