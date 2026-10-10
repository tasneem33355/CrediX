from src.ai_assistant.evaluation.metrics import ndcg_at_k, ranking_metrics, recall_at_k, reciprocal_rank_at_k


def test_perfect_ranking() -> None:
    metrics = ranking_metrics(["a", "b", "x"], ["a", "b"])
    assert metrics["recall_at_1"] == 0.5
    assert metrics["recall_at_3"] == 1.0
    assert metrics["mrr_at_10"] == 1.0
    assert metrics["ndcg_at_10"] == 1.0


def test_relevant_at_rank_five_and_no_result() -> None:
    ranking = ["x1", "x2", "x3", "x4", "r"]
    assert reciprocal_rank_at_k(ranking, ["r"]) == 0.2
    assert recall_at_k(ranking, ["r"], 5) == 1.0
    assert ndcg_at_k(ranking, ["r"]) < 1.0
    assert ranking_metrics(ranking, ["missing"])["hit_rate_at_10"] == 0.0


def test_multiple_relevant_chunks() -> None:
    assert recall_at_k(["r1", "x", "r2"], ["r1", "r2", "r3"], 3) == 2 / 3
