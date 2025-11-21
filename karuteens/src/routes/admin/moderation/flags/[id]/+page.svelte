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
    Shield,
    Eye,
    EyeOff
  } from 'lucide-svelte';

  // State variables
  let loading = true;
  let isAuthorized = false;
  let flag: any = null;
  let contentData: any = null;
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
    
    await loadFlag();
    loading = false;
  });

  // Load flag data
  async function loadFlag() {
    try {
      const flagId = $page.params.id;
      
      // Load flag
      const { data: flagData, error: flagError } = await supabase
        .from('auto_flags')
        .select('*')
        .eq('id', flagId)
        .single();
        
      if (flagError) throw flagError;
      
      flag = flagData;
      
      // Load content data based on content type
      if (flag.content_id) {
        await loadContentData();
      }
    } catch (error) {
      console.error('Error loading flag:', error);
    }
  }

  // Load content data based on content type
  async function loadContentData() {
    try {
      // This would be expanded based on the actual content types in your system
      // For now, we'll just set a placeholder
      contentData = {
        id: flag.content_id,
        type: flag.content_type,
        title: `${flag.content_type} ID: ${flag.content_id}`,
        url: `/${flag.content_type}/${flag.content_id}`
      };
    } catch (error) {
      console.error('Error loading content data:', error);
    }
  }

  // Update flag status
  async function updateFlagStatus(status: string) {
    actionSubmitting = true;
    
    try {
      const { error } = await supabase
        .from('auto_flags')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', flag.id);
        
      if (error) throw error;
      
      // Update local state
      flag.status = status;
      
      // Show success message
      alert(`Flag marked as ${status}`);
    } catch (error) {
      console.error('Error updating flag status:', error);
      alert('Failed to update flag status');
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
      case 'reviewed': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Get flag type class
  function getFlagTypeClass(flagType: string) {
    switch (flagType) {
      case 'toxicity': return 'bg-red-100 text-red-800';
      case 'nudity': return 'bg-orange-100 text-orange-800';
      case 'hate_speech': return 'bg-purple-100 text-purple-800';
      case 'spam': return 'bg-yellow-100 text-yellow-800';
      case 'copyright': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<main class="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
  <div class="flex items-center gap-4">
    <a href="/admin/moderation" class="p-2 rounded-lg hover:bg-gray-100">
      <ArrowLeft class="size-5" />
    </a>
    <h1 class="text-3xl font-bold">Auto Flag Details</h1>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !isAuthorized}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle class="size-12 text-red-600 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
      <p class="text-red-700">You don't have permission to view this flag.</p>
    </div>
  {:else if !flag}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle class="size-12 text-red-600 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-red-900 mb-2">Flag Not Found</h2>
      <p class="text-red-700">The requested flag could not be found.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Flag Details -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-xl shadow p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-xl font-semibold">Flag Information</h2>
            <span class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(flag.status)}`}>
              {flag.status}
            </span>
          </div>
          
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-500">Content Type</h3>
              <p class="text-lg capitalize">{flag.content_type}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Flag Type</h3>
              <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFlagTypeClass(flag.flag_type)}`}>
                {flag.flag_type.replace('_', ' ')}
              </span>
            </div>
            
            {#if flag.confidence_score}
              <div>
                <h3 class="text-sm font-medium text-gray-500">Confidence Score</h3>
                <p class="text-lg">{(flag.confidence_score * 100).toFixed(1)}%</p>
                <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full" 
                    style={`width: ${(flag.confidence_score * 100)}%`}
                  ></div>
                </div>
              </div>
            {/if}
            
            {#if flag.details}
              <div>
                <h3 class="text-sm font-medium text-gray-500">Details</h3>
                <pre class="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg overflow-x-auto">{JSON.stringify(flag.details, null, 2)}</pre>
              </div>
            {/if}
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Flagged At</h3>
              <p class="text-gray-900">{formatDate(flag.created_at)}</p>
            </div>
            
            <div>
              <h3 class="text-sm font-medium text-gray-500">Last Updated</h3>
              <p class="text-gray-900">{formatDate(flag.updated_at)}</p>
            </div>
          </div>
        </div>
        
        {#if contentData}
          <div class="bg-white rounded-xl shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Flagged Content</h2>
            
            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div class="flex-1">
                <h3 class="font-medium">{contentData.title}</h3>
                <p class="text-sm text-gray-600">{contentData.type}</p>
              </div>
              <a 
                href={contentData.url} 
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
              >
                <Eye class="size-4" />
                View Content
              </a>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Action Panel -->
      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Review Flag</h2>
          
          <div class="space-y-4">
            <p class="text-gray-700">Review the flagged content and decide whether action is needed.</p>
            
            <div class="space-y-3">
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={actionSubmitting}
                on:click={() => updateFlagStatus('reviewed')}
              >
                <Check class="size-4" />
                Mark as Reviewed
              </button>
              
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                disabled={actionSubmitting}
                on:click={() => updateFlagStatus('dismissed')}
              >
                <X class="size-4" />
                Dismiss Flag
              </button>
              
              {#if flag.status === 'pending'}
                <button
                  class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={actionSubmitting}
                  on:click={() => {
                    // In a real implementation, this would create a report
                    alert('In a real implementation, this would create a report for manual review');
                  }}
                >
                  <Shield class="size-4" />
                  Create Report
                </button>
              {/if}
            </div>
          </div>
        </div>
        
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 class="font-semibold text-blue-900 mb-2">Next Steps</h3>
          <ul class="text-sm text-blue-800 space-y-2">
            <li>• Review the flagged content to determine if it violates community guidelines</li>
            <li>• Check the confidence score to assess the AI's certainty</li>
            <li>• If needed, create a manual report for further investigation</li>
            <li>• Mark the flag as reviewed or dismissed based on your findings</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</main>