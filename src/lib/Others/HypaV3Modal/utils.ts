import { alertConfirm } from "src/ts/alert";

export async function alertConfirmTwice(
  firstMessage: string,
  secondMessage: string
): Promise<boolean> {
  return (
    (await alertConfirm(firstMessage)) && (await alertConfirm(secondMessage))
  );
}
