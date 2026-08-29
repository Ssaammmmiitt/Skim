import pytest

from pipeline.embed import embed_texts

EMBEDDING_DIM = 384


@pytest.fixture(scope="module")
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
