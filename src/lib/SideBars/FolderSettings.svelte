<script module lang="ts">
  import {
    FolderIcon, StarIcon, HeartIcon, SparklesIcon, FlameIcon, MoonIcon, SunIcon, CrownIcon,
    GemIcon, BookOpenIcon, MusicIcon, Gamepad2Icon, SwordIcon, GhostIcon, CatIcon, PawPrintIcon,
  } from "@lucide/svelte";

  export const folderIcons: Record<string, typeof FolderIcon> = {
    folder: FolderIcon, star: StarIcon, heart: HeartIcon, sparkles: SparklesIcon,
    flame: FlameIcon, moon: MoonIcon, sun: SunIcon, crown: CrownIcon,
    gem: GemIcon, book: BookOpenIcon, music: MusicIcon, gamepad: Gamepad2Icon,
    sword: SwordIcon, ghost: GhostIcon, cat: CatIcon, paw: PawPrintIcon,
  };
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { CheckIcon } from "@lucide/svelte";
  import { language } from "src/lang";
  import { DBState } from "src/ts/stores.svelte";
  import type { folder } from "src/ts/storage/database.svelte";
  import { getCharImage } from "src/ts/characters";
  import { selectSingleFile } from "src/ts/util";
  import { getFileSrc, saveAsset } from "src/ts/globalApi.svelte";
  import { folderColors, folderColorClass } from "./SidebarAvatar.svelte";
  import TextInput from "../UI/GUI/TextInput.svelte";
  import Button from "../UI/GUI/Button.svelte";
  import Portal from "../UI/GUI/Portal.svelte";

  let { id, onclose }: { id: string; onclose: () => void } = $props();

  const findFolder = () => DBState.db.characterOrder.find((v): v is folder => typeof v !== "string" && v.id === id);
  const original = $state.snapshot(findFolder());

  let name = $state(original?.name ?? "");
  let color = $state(original?.color ?? "default");
  let icon = $state(original?.icon ?? "folder");
  let imgFile = $state(original?.imgFile ?? "");
  let newImage = $state<Uint8Array | null>(null);
  let newImageUrl = $state("");
  let saving = $state(false);
  let error = $state("");
  let closed = false;

  const Icon = $derived(folderIcons[icon] ?? FolderIcon);
  const hasImage = $derived(!!(newImage || imgFile));
  const preview = $derived(newImageUrl || (imgFile ? getCharImage(imgFile, "plain") : ""));

  onMount(() => () => {
    closed = true;
    setImage(null);
  });

  function setImage(data: Uint8Array | null) {
    if (newImageUrl) URL.revokeObjectURL(newImageUrl);
    newImage = data;
    newImageUrl = data ? URL.createObjectURL(new Blob([data as BlobPart])) : "";
  }

  async function pickImage() {
    const file = await selectSingleFile(["png", "jpg", "webp"]);
    if (file && !closed) setImage(file.data);
  }

  function removeImage() {
    setImage(null);
    imgFile = "";
  }

  async function save() {
    if (saving || !name.trim()) return;
    saving = true;
    error = "";
    try {
      const target = findFolder();
      if (!target) throw new Error("Folder not found");
      if (newImage) {
        imgFile = await saveAsset(newImage);
        newImage = null;
      }
      target.name = name.trim();
      target.color = color;
      target.icon = icon === "folder" ? undefined : icon;
      if (imgFile !== (target.imgFile ?? "")) {
        target.imgFile = imgFile || null;
        target.img = imgFile ? await getFileSrc(imgFile) : "";
      }
      onclose();
    } catch (e) {
      error = `${e}`;
    } finally {
      saving = false;
    }
  }
</script>

<Portal>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 text-textcolor"
  onkeydown={(e) => {
    e.stopPropagation();
    if (e.key === "Escape" && !saving) onclose();
  }}
>
<div
  {@attach (el) => el.querySelector("input")?.focus()}
  class="max-h-full w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-md bg-darkbg p-4"
  role="dialog"
  aria-modal="true"
  aria-label={language.folderSettings}
>
  <h2 class="mt-0 mb-4 text-lg font-bold">{language.folderSettings}</h2>

  <div class="flex items-center gap-3">
    <div class="flex size-16 shrink-0 items-center justify-center overflow-hidden {folderColorClass(color)}"
      class:rounded-md={!DBState.db.roundIcons} class:rounded-full={DBState.db.roundIcons}>
      {#await preview then src}
        {#if src}
          <img class="size-full object-cover" {src} alt="" />
        {:else}
          <Icon size={28} />
        {/if}
      {/await}
    </div>
    <div class="min-w-0 flex-1">
      <span class="mb-2 block text-sm text-textcolor2">{language.folderName}</span>
      <TextInput bind:value={name} fullwidth size="sm" />
    </div>
  </div>

  <span class="mt-4 mb-2 block text-sm text-textcolor2">{language.folderColor}</span>
  <div class="flex flex-wrap gap-2">
    {#each folderColors as c}
      <button
        class="flex size-7 items-center justify-center rounded-md border border-darkborderc {folderColorClass(c)}"
        title={c}
        aria-label={c}
        aria-pressed={color === c}
        onclick={() => (color = c)}
      >
        {#if color === c}<CheckIcon size={16} />{/if}
      </button>
    {/each}
  </div>

  <span class="mt-4 mb-2 block text-sm text-textcolor2">{language.icon}</span>
  <div class="grid grid-cols-8 gap-1 transition-opacity" class:opacity-40={hasImage}>
    {#each Object.entries(folderIcons) as [key, IconOption]}
      <button
        class="flex h-8 items-center justify-center rounded-md hover:bg-selected {icon === key ? 'bg-selected text-textcolor' : 'text-textcolor2'}"
        title={key}
        aria-label={key}
        aria-pressed={icon === key}
        onclick={() => (icon = key)}
      >
        <IconOption size={18} />
      </button>
    {/each}
  </div>

  <span class="mt-4 mb-2 block text-sm text-textcolor2">{language.image}</span>
  <div class="flex gap-2">
    <Button size="sm" disabled={saving} onclick={pickImage}>{language.selectFile}</Button>
    {#if hasImage}
      <Button size="sm" styled="outlined" disabled={saving} onclick={removeImage}>{language.remove}</Button>
    {/if}
  </div>

  {#if error}
    <p class="mt-4 mb-0 text-sm text-draculared">{error}</p>
  {/if}

  <div class="mt-4 flex justify-end gap-2">
    <Button styled="outlined" disabled={saving} onclick={onclose}>{language.cancel}</Button>
    <Button disabled={saving || !name.trim()} onclick={save}>{language.apply}</Button>
  </div>
</div>
</div>
</Portal>
