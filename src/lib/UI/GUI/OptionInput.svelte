<option value={value} selected={selected} class="bg-darkbg appearance-none"><slot></slot></option>
<script lang="ts">
    export let value:string
    export let selected:boolean = false
</script>