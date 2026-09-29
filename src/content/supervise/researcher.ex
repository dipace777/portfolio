defmodule Agents.Researcher do
  use GenServer

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_opts) do
    {:ok, Agents.Checkpoints.load(__MODULE__)}
  end

  @impl true
  def handle_call({:step, input}, _from, state) do
    {:ok, reply} = Agents.LLM.complete(state.context ++ [input])
    %{"findings" => findings} = Jason.decode!(reply)

    if state.steps >= 20, do: raise("step budget exhausted")

    state = %{state | context: state.context ++ [input, reply], steps: state.steps + 1}
    :ok = Agents.Checkpoints.save(__MODULE__, state)
    {:reply, findings, state}
  end
end
