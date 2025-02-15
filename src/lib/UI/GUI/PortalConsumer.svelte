<script lang="ts">
	const { children } = $props();
</script>

{#if children}
	{@render children()}
{/if}