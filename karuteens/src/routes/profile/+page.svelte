<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase/client';
	import { onMount } from 'svelte';

	let profile: any = null;
	let posts: any[] = [];
	let loading = true;
	let editing = false;
	let saving = false;
	let uploadingAvatar = false;
	let successMessage = '';
	let showAccountSettings = false;
	let showPrivacySettings = false;
	let showDeleteConfirm = false;
	let editForm = {
		username: '',
		fullName: '',
		bio: '',
		location: '',
		website: '',
		twitterHandle: '',
		instagramHandle: '',
		avatarUrl: ''
	};
	let privacyForm = {
		isPrivate: false,
		showEmail: false
	};
	let passwordForm = {
		newPassword: '',
		confirmPassword: ''
	};

	onMount(async () => {
		if ($user) {
			await loadProfile();
			await loadPosts();
		}
		loading = false;
	});

	async function loadProfile() {
		if (!$user) return;

		const { data, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', $user.id)
			.single();

		if (data) {
			profile = data;
			editForm = {
				username: data.username || '',
				fullName: data.full_name || '',
				bio: data.bio || '',
				location: data.location || '',
				website: data.website || '',
				twitterHandle: data.twitter_handle || '',
				instagramHandle: data.instagram_handle || '',
				avatarUrl: data.avatar_url || ''
			};
			privacyForm = {
				isPrivate: data.is_private || false,
				showEmail: data.show_email || false
			};
		} else if (error) {
			// Profile doesn't exist, create one
			await createProfile();
		}
	}

	async function createProfile() {
		if (!$user) return;

		const username = $user.email?.split('@')[0] || `user_${$user.id.slice(0, 8)}`;
		const { data, error } = await supabase
			.from('profiles')
			.insert({
				id: $user.id,
				username,
				full_name: $user.user_metadata?.username || null,
				bio: null,
				location: null,
				website: null,
				twitter_handle: null,
				instagram_handle: null,
				is_private: false,
				show_email: false
			})
			.select()
			.single();

		if (data) {
			profile = data;
			editForm.username = data.username;
			editForm.fullName = data.full_name || '';
			editForm.location = '';
			editForm.website = '';
			editForm.twitterHandle = '';
			editForm.instagramHandle = '';
			editForm.avatarUrl = '';
		}
	}

	async function loadPosts() {
		if (!$user) return;

		const { data } = await supabase
			.from('posts')
			.select('*')
			.eq('author_id', $user.id)
			.order('created_at', { ascending: false });

		if (data) {
			posts = data;
		}
	}

	async function saveProfile() {
		if (!$user || !profile) return;

		saving = true;
		successMessage = '';

		const { error } = await supabase
			.from('profiles')
			.update({
				username: editForm.username,
				full_name: editForm.fullName || null,
				bio: editForm.bio || null,
				location: editForm.location || null,
				website: editForm.website || null,
				twitter_handle: editForm.twitterHandle || null,
				instagram_handle: editForm.instagramHandle || null,
				avatar_url: editForm.avatarUrl || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', $user.id);

		if (!error) {
			await loadProfile();
			editing = false;
			successMessage = 'Profile updated successfully!';
			setTimeout(() => (successMessage = ''), 3000);
		} else {
			alert('Failed to update profile: ' + error.message);
		}

		saving = false;
	}

	async function handleAvatarUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !$user) return;

		uploadingAvatar = true;
		successMessage = '';

		try {
			console.log('Uploading avatar for user:', $user.id);
			
			// Upload to Cloudflare R2
			const formData = new FormData();
			formData.append('file', file);
			formData.append('userId', $user.id);

			const response = await fetch('/api/upload-avatar', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Upload failed:', errorText);
				throw new Error('Upload failed: ' + errorText);
			}

			const { url } = await response.json();
			console.log('Avatar uploaded to:', url);

			// Update profile with new avatar URL
			const { data, error: updateError } = await supabase
				.from('profiles')
				.update({ avatar_url: url, updated_at: new Date().toISOString() })
				.eq('id', $user.id)
				.select();

			if (updateError) {
				console.error('Database update error:', updateError);
				throw updateError;
			}

			console.log('Profile updated:', data);
			editForm.avatarUrl = url;
			await loadProfile();
			successMessage = 'Avatar updated successfully!';
			setTimeout(() => (successMessage = ''), 3000);
		} catch (error: any) {
			console.error('Avatar upload error:', error);
			alert('Failed to upload avatar: ' + error.message);
		} finally {
			uploadingAvatar = false;
		}
	}

	async function savePrivacySettings() {
		if (!$user) return;

		saving = true;
		const { error } = await supabase
			.from('profiles')
			.update({
				is_private: privacyForm.isPrivate,
				show_email: privacyForm.showEmail
			})
			.eq('id', $user.id);

		if (!error) {
			await loadProfile();
			showPrivacySettings = false;
			successMessage = 'Privacy settings updated!';
			setTimeout(() => (successMessage = ''), 3000);
		} else {
			alert('Failed to update privacy settings: ' + error.message);
		}

		saving = false;
	}

	async function changePassword() {
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			alert('Passwords do not match');
			return;
		}

		if (passwordForm.newPassword.length < 6) {
			alert('Password must be at least 6 characters');
			return;
		}

		saving = true;
		const { error } = await supabase.auth.updateUser({
			password: passwordForm.newPassword
		});

		if (!error) {
			passwordForm.newPassword = '';
			passwordForm.confirmPassword = '';
			showAccountSettings = false;
			successMessage = 'Password changed successfully!';
			setTimeout(() => (successMessage = ''), 3000);
		} else {
			alert('Failed to change password: ' + error.message);
		}

		saving = false;
	}

	async function deleteAccount() {
		if (!$user) return;

		try {
			// Delete user's profile and data
			const { error: profileError } = await supabase
				.from('profiles')
				.delete()
				.eq('id', $user.id);

			if (profileError) throw profileError;

			// Sign out
			await supabase.auth.signOut();
			window.location.href = '/auth/sign-in';
		} catch (error: any) {
			alert('Failed to delete account: ' + error.message);
		}
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<main class="max-w-screen-lg mx-auto px-4 py-8 space-y-6">
	{#if successMessage}
		<div class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
			<div class="flex items-center gap-2">
				<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				{successMessage}
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="rounded-2xl border bg-white shadow-sm p-12 text-center">
			<div class="inline-block size-10 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
			<p class="mt-4 text-sm text-foreground/60">Loading profile...</p>
		</div>
	{:else if !$user}
		<div class="rounded-2xl border bg-white shadow-sm p-12 text-center">
			<p class="text-foreground/60">Please sign in to view your profile.</p>
		</div>
	{:else if editing}
		<!-- EDIT MODE - Modern Card Design -->
		<div class="rounded-2xl border bg-white shadow-lg overflow-hidden">
			<!-- Header -->
			<div class="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold">Edit Your Profile</h2>
					<button 
						class="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm text-sm font-medium" 
						on:click={() => (editing = false)}
						disabled={saving}
					>
						Cancel
					</button>
				</div>
			</div>

			<!-- Avatar Section -->
			<div class="px-6 py-6 border-b bg-gray-50/50">
				<div class="flex items-center gap-6">
					<div class="relative group">
						{#if editForm.avatarUrl}
							<img src={editForm.avatarUrl} alt="Avatar" class="size-24 rounded-full object-cover ring-4 ring-white shadow-lg" />
						{:else}
							<div class="size-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white shadow-lg">
								{editForm.username?.charAt(0).toUpperCase() || 'U'}
							</div>
						{/if}
						<label class="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
							<input type="file" accept="image/*" class="hidden" on:change={handleAvatarUpload} disabled={uploadingAvatar} />
							{#if uploadingAvatar}
								<svg class="size-6 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4"/>
									<path class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
								</svg>
							{:else}
								<svg class="size-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
								</svg>
							{/if}
						</label>
					</div>
					<div class="flex-1">
						<h3 class="font-semibold text-lg">Profile Picture</h3>
						<p class="text-sm text-foreground/60 mt-1">Click on the avatar to upload a new photo</p>
						<p class="text-xs text-foreground/40 mt-1">JPG, PNG or GIF. Max size 5MB.</p>
					</div>
				</div>
			</div>

			<!-- Form Fields -->
			<div class="px-6 py-6 space-y-5">
				<div class="grid gap-5 md:grid-cols-2">
					<label class="block space-y-2 md:col-span-2">
						<span class="text-sm font-medium text-foreground/90">Username *</span>
						<input
							class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							type="text"
							bind:value={editForm.username}
							required
						/>
					</label>

					<label class="block space-y-2 md:col-span-2">
						<span class="text-sm font-medium text-foreground/90">Full Name</span>
						<input
							class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							type="text"
							bind:value={editForm.fullName}
						/>
					</label>

					<label class="block space-y-2">
						<span class="text-sm font-medium text-foreground/90">Location</span>
						<input
							class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							type="text"
							bind:value={editForm.location}
							placeholder="City, Country"
						/>
					</label>

					<label class="block space-y-2">
						<span class="text-sm font-medium text-foreground/90">Website</span>
						<input
							class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							type="url"
							bind:value={editForm.website}
							placeholder="https://"
						/>
					</label>

					<label class="block space-y-2">
						<span class="text-sm font-medium text-foreground/90">Twitter Handle</span>
						<input
							class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							type="text"
							bind:value={editForm.twitterHandle}
							placeholder="@username"
						/>
					</label>

					<label class="block space-y-2">
						<span class="text-sm font-medium text-foreground/90">Instagram Handle</span>
						<input
							class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							type="text"
							bind:value={editForm.instagramHandle}
							placeholder="@username"
						/>
					</label>

					<label class="block space-y-2 md:col-span-2">
						<span class="text-sm font-medium text-foreground/90">Bio</span>
						<textarea
							class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
							rows="4"
							bind:value={editForm.bio}
							placeholder="Tell us about yourself..."
						></textarea>
					</label>
				</div>
			</div>

			<!-- Footer Actions -->
			<div class="px-6 py-4 bg-gray-50 border-t flex gap-3 justify-end">
				<button 
					class="px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-sm font-medium transition-colors" 
					on:click={() => (editing = false)}
					disabled={saving}
				>
					Cancel
				</button>
				<button 
					class="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all" 
					on:click={saveProfile}
					disabled={saving || !editForm.username}
				>
					{#if saving}
						<svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle class="opacity-25" cx="12" cy="12" r="10"/>
							<path class="opacity-75" d="M4 12a8 8 0 0 1 8-8"/>
						</svg>
						Saving...
					{:else}
						<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
						</svg>
						Save Changes
					{/if}
				</button>
			</div>
		</div>
	{:else}
		<!-- VIEW MODE - Modern Profile Card -->
		<div class="rounded-2xl border bg-white shadow-lg overflow-hidden">
			<!-- Cover/Header -->
			<div class="h-32 bg-gradient-to-r from-blue-600 to-purple-600 relative">
				<div class="absolute -bottom-16 left-6">
					{#if profile?.avatar_url}
						<img src={profile.avatar_url} alt="Avatar" class="size-32 rounded-full object-cover ring-4 ring-white shadow-xl" />
					{:else}
						<div class="size-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white shadow-xl">
							{profile?.username?.charAt(0).toUpperCase() || 'U'}
						</div>
					{/if}
				</div>
				<div class="absolute top-4 right-4 flex gap-2">
					<button 
						class="px-4 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-900 text-sm font-medium shadow-lg flex items-center gap-2 transition-all hover:scale-105" 
						on:click={() => (editing = true)}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
						</svg>
						Edit Profile
					</button>
					<button 
						class="p-2 rounded-lg bg-white/90 hover:bg-white text-gray-900 shadow-lg transition-all hover:scale-105" 
						on:click={() => (showAccountSettings = !showAccountSettings)}
						aria-label="Account Settings"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="3"/>
							<path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Profile Info -->
			<div class="px-6 pt-20 pb-6 space-y-4">
				<div>
					<h1 class="text-2xl font-bold">{profile?.full_name || 'Anonymous User'}</h1>
					<p class="text-foreground/60">@{profile?.username || 'username'}</p>
				</div>

				{#if profile?.bio}
					<p class="text-foreground/80 leading-relaxed">{profile.bio}</p>
				{:else}
					<p class="text-foreground/40 italic">No bio yet. Click "Edit Profile" to add one!</p>
				{/if}

				<!-- Info Grid -->
				<div class="flex flex-wrap gap-4 text-sm text-foreground/70">
					{#if profile?.location}
						<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
							<svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
								<circle cx="12" cy="10" r="3"/>
							</svg>
							{profile.location}
						</div>
					{/if}
					{#if profile?.website}
						<a href={profile.website} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-blue-100 hover:text-blue-600 transition-colors">
							<svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"/>
								<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
							</svg>
							{profile.website.replace(/^https?:\/\//, '')}
						</a>
					{/if}
					{#if profile?.twitter_handle}
						<a href="https://twitter.com/{profile.twitter_handle.replace('@', '')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-blue-100 hover:text-blue-600 transition-colors">
							<svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="currentColor">
								<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
							</svg>
							{profile.twitter_handle}
						</a>
					{/if}
					{#if profile?.instagram_handle}
						<a href="https://instagram.com/{profile.instagram_handle.replace('@', '')}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-pink-100 hover:text-pink-600 transition-colors">
							<svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
								<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
								<line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
							</svg>
							{profile.instagram_handle}
						</a>
					{/if}
				</div>

				{#if privacyForm.showEmail}
					<div class="text-sm text-foreground/60 flex items-center gap-2">
						<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
						</svg>
						<span class="font-medium">{$user?.email}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Account Settings Modal -->
		{#if showAccountSettings}
			<section class="rounded-xl border bg-white p-4 space-y-4">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-medium">Account Settings</h2>
					<button class="text-sm text-foreground/60 hover:text-foreground" on:click={() => (showAccountSettings = false)}>
						✕
					</button>
				</div>

				<!-- Change Password -->
				<div class="space-y-3 border-t pt-4">
					<h3 class="font-medium">Change Password</h3>
					<label class="block space-y-1">
						<span class="text-sm text-foreground/80">New Password</span>
						<input
							class="w-full rounded border px-3 py-2 text-sm"
							type="password"
							bind:value={passwordForm.newPassword}
							placeholder="Enter new password"
						/>
					</label>
					<label class="block space-y-1">
						<span class="text-sm text-foreground/80">Confirm Password</span>
						<input
							class="w-full rounded border px-3 py-2 text-sm"
							type="password"
							bind:value={passwordForm.confirmPassword}
							placeholder="Confirm new password"
						/>
					</label>
					<button 
						class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-50" 
						on:click={changePassword}
						disabled={saving || !passwordForm.newPassword || !passwordForm.confirmPassword}
					>
						{saving ? 'Updating...' : 'Update Password'}
					</button>
				</div>

				<!-- Privacy Settings -->
				<div class="space-y-3 border-t pt-4">
					<h3 class="font-medium">Privacy Settings</h3>
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" bind:checked={privacyForm.isPrivate} class="rounded" />
						<span class="text-sm">Make profile private</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" bind:checked={privacyForm.showEmail} class="rounded" />
						<span class="text-sm">Show email on profile</span>
					</label>
					<button 
						class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-50" 
						on:click={savePrivacySettings}
						disabled={saving}
					>
						{saving ? 'Saving...' : 'Save Privacy Settings'}
					</button>
				</div>

				<!-- Delete Account -->
				<div class="space-y-3 border-t pt-4">
					<h3 class="font-medium text-red-600">Danger Zone</h3>
					<p class="text-sm text-foreground/60">Once you delete your account, there is no going back. Please be certain.</p>
					{#if !showDeleteConfirm}
						<button 
							class="px-4 py-2 rounded-md border border-red-600 text-red-600 text-sm font-medium hover:bg-red-50" 
							on:click={() => (showDeleteConfirm = true)}
						>
							Delete Account
						</button>
					{:else}
						<div class="bg-red-50 border border-red-200 rounded p-3 space-y-2">
							<p class="text-sm text-red-800 font-medium">Are you absolutely sure?</p>
							<p class="text-sm text-red-600">This action cannot be undone.</p>
							<div class="flex gap-2">
								<button 
									class="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium" 
									on:click={deleteAccount}
								>
									Yes, Delete My Account
								</button>
								<button 
									class="px-4 py-2 rounded-md border text-sm" 
									on:click={() => (showDeleteConfirm = false)}
								>
									Cancel
								</button>
							</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<section class="space-y-3">
			<h2 class="text-lg font-medium">Posts ({posts.length})</h2>
			{#if posts.length === 0}
				<div class="rounded-xl border bg-white p-8 text-center">
					<p class="text-foreground/60">No posts yet.</p>
					<a href="/feed" class="inline-block mt-2 text-sm text-blue-600 hover:underline">
						Create your first post
					</a>
				</div>
			{:else}
				{#each posts as post (post.id)}
					<article class="rounded-xl border bg-white p-4 space-y-2">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-2">
								<div class="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
									{profile?.username?.charAt(0).toUpperCase()}
								</div>
								<div class="text-sm">
									<span class="font-medium">@{profile?.username}</span>
								</div>
							</div>
							<time class="text-xs text-foreground/60">{formatDate(post.created_at)}</time>
						</div>
						<p class="text-sm text-foreground/90">{post.content}</p>
						{#if post.image_url}
							<img src={post.image_url} alt="Post" class="rounded-lg max-w-full" />
						{/if}
					</article>
				{/each}
			{/if}
		</section>
	{/if}
</main>
