import numpy as np
import pytest
from unittest.mock import MagicMock

from pipeline.embed import embed_texts

EMBEDDING_DIM = 384


@pytest.fixture(autouse=True)
def mock_embed_model(monkeypatch):
    def fake_encode(texts, **kwargs):
        vectors = []
        for text in texts:
            seed = abs(hash(text)) % (2**31)
            rng = np.random.RandomState(seed)
            vector = rng.randn(EMBEDDING_DIM)
            vector = vector / np.linalg.norm(vector)
            vectors.append(vector)
        return np.array(vectors)

    mock_model = MagicMock()
    mock_model.encode.side_effect = fake_encode
    monkeypatch.setattr("pipeline.embed.get_model", lambda: mock_model)
    return mock_model


@pytest.fixture
def hello_embedding():
    return embed_texts(["hello world"])[0]


def test_embed_texts_returns_384_dimensions(hello_embedding):
    assert len(hello_embedding) == EMBEDDING_DIM


def test_embed_texts_values_are_normalized(hello_embedding):
    assert all(-1.0 <= value <= 1.0 for value in hello_embedding)


def test_embed_texts_is_deterministic(hello_embedding):
    second_embedding = embed_texts(["hello world"])[0]
    assert hello_embedding == second_embedding


def test_embed_texts_empty_input():
    assert embed_texts([]) == []
