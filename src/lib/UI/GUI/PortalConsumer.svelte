<script lang="ts">
	const { children } = $props();
</script>

{#if children}
	{@render children()}
{:else}
	<div class="empty-portal"></div>
{/if}