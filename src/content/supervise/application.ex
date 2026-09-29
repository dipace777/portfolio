defmodule Agents.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Agents.SessionStore,
      Agents.ResearchSupervisor,
      Agents.ToolSupervisor
    ]

    Supervisor.start_link(children,
      strategy: :one_for_one,
      max_restarts: 3,
      max_seconds: 5,
      name: Agents.Supervisor
    )
  end
end

defmodule Agents.ResearchSupervisor do
  use Supervisor

  def start_link(opts), do: Supervisor.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_opts) do
    children = [Agents.Planner, Agents.Researcher, Agents.Writer]
    Supervisor.init(children, strategy: :one_for_all)
  end
end
