<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}
	const { children }: Props = $props();
</script>

{#if children}
	{@render children()}
{:else}
	<div class="empty-portal"></div>
{/if}