"""
Minimum-transfer settlement on net balances using a greedy clearing algorithm.

Uses NetworkX to model the resulting payment graph and to report graph metrics.
For net balances that sum to zero, this greedy creditor–debtor matching produces
the minimum number of non-zero transfers (standard result).
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

import networkx as nx

from app.models.schemas import OptimizeSettlementRequest, OptimizeSettlementResponse


def _greedy_clearing_transfers(
    balances: Dict[str, float],
) -> Tuple[List[Dict[str, Any]], int, int, int]:
    """
    Returns (transactions, n_creditors, n_debtors, parties_nonzero).
    Each transaction: {"from": debtor_id, "to": creditor_id, "amount": float}
    """
    creditors: List[List[Any]] = []
    debtors: List[List[Any]] = []

    parties = 0
    for user_id, raw in balances.items():
        uid = str(user_id).strip()
        if not uid:
            continue
        try:
            b = float(raw)
        except (TypeError, ValueError):
            continue
        if abs(b) < 1e-9:
            continue
        parties += 1
        if b > 0:
            creditors.append([uid, b])
        elif b < 0:
            debtors.append([uid, -b])

    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)

    transactions: List[Dict[str, Any]] = []
    c_idx, d_idx = 0, 0

    while c_idx < len(creditors) and d_idx < len(debtors):
        creditor_id, creditor_amount = creditors[c_idx]
        debtor_id, debtor_amount = debtors[d_idx]
        transfer = min(creditor_amount, debtor_amount)

        transactions.append(
            {
                "from": debtor_id,
                "to": creditor_id,
                "amount": round(transfer, 2),
            }
        )

        creditors[c_idx][1] -= transfer
        debtors[d_idx][1] -= transfer

        if creditors[c_idx][1] < 1e-9:
            c_idx += 1
        if debtors[d_idx][1] < 1e-9:
            d_idx += 1

    return transactions, len(creditors), len(debtors), parties


def _build_flow_graph(transactions: List[Dict[str, Any]]) -> nx.MultiDiGraph:
    """Directed multigraph: debtor -> creditor with capacity = amount."""
    g = nx.MultiDiGraph()
    for t in transactions:
        frm = t["from"]
        to = t["to"]
        amt = float(t.get("amount", 0))
        g.add_edge(frm, to, weight=amt, amount=amt)
    return g


def optimize_settlement(payload: OptimizeSettlementRequest) -> OptimizeSettlementResponse:
    txs, n_cred, n_debt, parties = _greedy_clearing_transfers(dict(payload.balances))

    naive_bipartite_upper = n_cred * n_debt if (n_cred and n_debt) else len(txs)
    tx_count = len(txs)
    saved = max(0, naive_bipartite_upper - tx_count)

    g = _build_flow_graph(txs)
    graph_nodes = g.number_of_nodes()
    graph_edges = g.number_of_edges()

    legacy = payload.legacy_suggestion_count
    legacy_saved = max(0, int(legacy) - tx_count) if legacy is not None else None

    return OptimizeSettlementResponse(
        transactions=txs,
        transaction_count=tx_count,
        naive_bipartite_upper_bound=naive_bipartite_upper,
        transactions_saved_vs_bipartite=saved,
        transactions_saved_vs_legacy=legacy_saved,
        parties_with_nonzero_balance=parties,
        graph_nodes=graph_nodes,
        graph_edges=graph_edges,
        algorithm="greedy_net_clearing_networkx",
    )
