<script lang="ts">
  import { characterFormatUpdate, getCharImage } from "../../ts/characters";
  import { DataBase } from "../../ts/database";
  import BarIcon from "../SideBars/BarIcon.svelte";
  import { User, Users } from "lucide-svelte";
  import { selectedCharID } from "../../ts/stores";
  export let endGrid = () => {};
  let search = "";

  function changeChar(index = -1) {
    characterFormatUpdate(index);
    selectedCharID.set(index);
    endGrid();
  }
</script>

<div class="flex h-full w-full justify-center">
  <div class="flex h-full w-2xl max-w-full flex-col items-center bg-darkbg p-2">
    <h1 class="mt-2 text-2xl font-bold text-neutral-200">Catalog</h1>
    <input
      class="input-text mb-4 mt-2 w-4/5 bg-transparent p-2 text-xl text-neutral-200 focus:bg-selected"
      placeholder="Search"
      bind:value={search}
    />
    <div class="flex w-full justify-center">
      <div class="container mx-auto flex flex-wrap gap-2">
        {#each $DataBase.characters.filter((c) => {
          return c.name
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase());
        }) as char, i}
          <div class="flex items-center text-neutral-200">
            {#if char.image}
              <BarIcon
                onClick={() => {
                  changeChar(i);
                }}
                additionalStyle={getCharImage(
                  $DataBase.characters[i].image,
                  "css"
                )}
              />
            {:else}
              <BarIcon
                onClick={() => {
                  changeChar(i);
                }}
                additionalStyle={i === $selectedCharID
                  ? "background:#44475a"
                  : ""}
              >
                {#if char.type === "group"}
                  <Users />
                {:else}
                  <User />
                {/if}
              </BarIcon>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  @media (max-width: 640px) {
    .container {
      justify-content: center;
      width: fit-content;
    }
  }
</style>
