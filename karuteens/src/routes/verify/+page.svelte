<script lang="ts">
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { CheckCircle, Smartphone, Shield, AlertCircle } from 'lucide-svelte';

  let phone = '';
  let processing = false;
  let success = false;
  let error = '';
  let checkoutRequestId = '';

  async function initiateVerification() {
    if (!$user) {
      window.location.href = '/auth/sign-in';
      return;
    }

    // Validate phone number
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Convert to 254 format if needed
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      formattedPhone = '254' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) {
      formattedPhone = '254' + cleanPhone;
    }

    // Validate format
    if (!formattedPhone.match(/^254[17]\d{8}$/)) {
      error = 'Please enter a valid Kenyan phone number (e.g., 0712345678)';
      return;
    }

    processing = true;
    error = '';

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        checkoutRequestId = data.checkoutRequestId;
        success = true;
        
        // Update user verification status in database
        await supabase
          .from('profiles')
          .update({ 
            is_verified: true,
            verified_phone: formattedPhone,
            updated_at: new Date().toISOString()
          })
          .eq('id', $user.id);
      } else {
        error = data.error || 'Failed to initiate payment. Please try again.';
      }
    } catch (err: any) {
      error = 'Network error. Please check your connection and try again.';
      console.error('Verification error:', err);
    } finally {
      processing = false;
    }
  }

  function formatPhoneDisplay(value: string) {
    // Auto-format as user types
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 10) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  }

  function handlePhoneInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    phone = formatPhoneDisplay(value);
  }
</script>

<main class="max-w-screen-sm mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <div class="inline-flex items-center justify-center size-16 rounded-full bg-blue-100 mb-4">
      <Shield class="size-8 text-blue-600" />
    </div>
    <h1 class="text-4xl font-black">Verify Your Account</h1>
    <p class="text-foreground/70">Verify your student identity with M-Pesa</p>
  </div>

  {#if success}
    <div class="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-4">
      <div class="inline-flex items-center justify-center size-20 rounded-full bg-green-100">
        <CheckCircle class="size-12 text-green-600" />
      </div>
      <h2 class="text-2xl font-bold text-green-900">Payment Initiated!</h2>
      <div class="space-y-2">
        <p class="text-green-800">
          Please check your phone for the M-Pesa payment prompt.
        </p>
        <p class="text-sm text-green-700">
          Enter your M-Pesa PIN to complete the KES 10 verification payment.
        </p>
      </div>
      <div class="bg-green-100 rounded-lg p-4 text-left">
        <p class="text-xs font-mono text-green-800 break-all">
          Checkout Request ID: {checkoutRequestId}
        </p>
      </div>
      <div class="pt-4">
        <a href="/profile" class="inline-block px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-all">
          Go to Profile
        </a>
      </div>
    </div>
  {:else}
    <div class="bg-white rounded-2xl shadow-xl p-8 space-y-6">
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 class="font-bold text-blue-900 mb-2">Why Verify?</h3>
        <ul class="text-sm text-blue-800 space-y-1">
          <li>• Get a verified badge on your profile</li>
          <li>• Build trust with other students</li>
          <li>• Access exclusive verified-only features</li>
          <li>• One-time fee of only KES 10</li>
        </ul>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold mb-2 flex items-center gap-2">
            <Smartphone class="size-4" />
            M-Pesa Phone Number
          </label>
          <input 
            type="tel"
            class="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="0712 345 678"
            value={phone}
            on:input={handlePhoneInput}
            maxlength="12"
            disabled={processing}
          />
          <p class="text-xs text-foreground/60 mt-1">
            Enter your Safaricom number (starts with 07 or 01)
          </p>
        </div>

        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle class="size-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p class="text-sm text-red-800">{error}</p>
          </div>
        {/if}

        <button 
          class="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold text-lg hover:shadow-lg disabled:opacity-50 transition-all"
          on:click={initiateVerification}
          disabled={processing || !phone}
        >
          {#if processing}
            <span class="flex items-center justify-center gap-2">
              <div class="animate-spin size-5 border-2 border-white border-t-transparent rounded-full"></div>
              Processing...
            </span>
          {:else}
            Pay KES 10 to Verify
          {/if}
        </button>
      </div>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-sm text-yellow-800">
          <strong>Note:</strong> You will receive an M-Pesa prompt on your phone. Enter your PIN to complete the payment. 
          The verification is instant once payment is confirmed.
        </p>
      </div>
    </div>

    <!-- How it Works -->
    <div class="bg-gray-50 rounded-2xl p-6">
      <h3 class="font-bold text-lg mb-4">How It Works</h3>
      <div class="space-y-3">
        <div class="flex gap-3">
          <div class="flex-shrink-0 size-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
          <div>
            <p class="font-medium">Enter Your Phone Number</p>
            <p class="text-sm text-foreground/60">Use the same number registered with M-Pesa</p>
          </div>
        </div>
        <div class="flex gap-3">
          <div class="flex-shrink-0 size-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
          <div>
            <p class="font-medium">Receive M-Pesa Prompt</p>
            <p class="text-sm text-foreground/60">Check your phone for the payment request</p>
          </div>
        </div>
        <div class="flex gap-3">
          <div class="flex-shrink-0 size-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
          <div>
            <p class="font-medium">Enter Your PIN</p>
            <p class="text-sm text-foreground/60">Complete the KES 10 payment</p>
          </div>
        </div>
        <div class="flex gap-3">
          <div class="flex-shrink-0 size-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">✓</div>
          <div>
            <p class="font-medium">Get Verified!</p>
            <p class="text-sm text-foreground/60">Your account is instantly verified</p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>
