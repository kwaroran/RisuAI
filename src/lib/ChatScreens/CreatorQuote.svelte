<div class="flex w-full justify-center mt-4 max-w-100vw">
    <div class="w-5/6 max-w-80vw bg-darkbg rounded-md p-3 text-textcolor text-sm">
        <h1 class="font-bold mb-2">{language.creatorNotes}
            <button class="float-right" onclick={onRemove}>
                <XIcon />
            </button>
        </h1>
        <MultiLangDisplay value={quote} markdown={true} />
    </div>
</div>
<script lang="ts">
    import { XIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import MultiLangDisplay from "../UI/GUI/MultiLangDisplay.svelte";

    interface Props {
        onRemove: () => void;
        quote: string;
    }

    let { onRemove, quote }: Props = $props();
</script>