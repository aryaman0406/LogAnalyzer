import asyncio

import httpx
import pytest

import api.services.ml_model_client as m

OK = {"schema_version": "1.0", "model_version": "1.0.0", "n_lines": 3, "n_content_lines": 3,
      "travis_fold_markers": 1, "warnings": [],
      "top_lines": [{"line_no": 2, "score": 0.9, "section": "script", "text": "Error: boom"}]}


def client(handler, **kw):
    kw.setdefault("max_retries", 2)
    c = m.MlModelClient(base_url="http://svc", api_key="k", transport=httpx.MockTransport(handler), **kw)
    return c


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    async def fast(_): return None
    monkeypatch.setattr(m.asyncio, "sleep", fast)


def run(coro):
    return asyncio.run(coro)


def test_success_and_header():
    seen = {}
    def h(req):
        seen["key"] = req.headers.get("x-api-key")
        return httpx.Response(200, json=OK)
    r = run(client(h).predict("log"))
    assert r.available and r.top_lines[0]["line_no"] == 2 and seen["key"] == "k"
    assert "not proof" in r.as_prompt_block()


def test_not_configured():
    r = run(m.MlModelClient(base_url="").predict("log"))
    assert not r.available and "not configured" in r.reason
    assert "UNAVAILABLE" in r.as_prompt_block()


def test_retry_on_503_then_ok():
    calls = []
    def h(req):
        calls.append(1)
        return httpx.Response(503) if len(calls) < 3 else httpx.Response(200, json=OK)
    assert run(client(h).predict("log")).available and len(calls) == 3


def test_gives_up_after_retries():
    calls = []
    def h(req):
        calls.append(1); return httpx.Response(503)
    r = run(client(h).predict("log"))
    assert not r.available and len(calls) == 3


def test_no_retry_on_401_and_422():
    for code in (401, 422):
        calls = []
        def h(req, code=code):
            calls.append(1); return httpx.Response(code)
        r = run(client(h).predict("log"))
        assert not r.available and len(calls) == 1


def test_timeout_is_handled():
    def h(req): raise httpx.ReadTimeout("slow")
    r = run(client(h, max_retries=1).predict("log"))
    assert not r.available and "unreachable" in r.reason


def test_bad_schema_and_garbage():
    assert not run(client(lambda r: httpx.Response(200, json={**OK, "schema_version": "2.0"})).predict("l")).available
    assert not run(client(lambda r: httpx.Response(200, text="<html>")).predict("l")).available
    assert not run(client(lambda r: httpx.Response(200, json={"schema_version": "1.0"})).predict("l")).available


def test_cache_avoids_duplicate_calls():
    calls = []
    def h(req):
        calls.append(1); return httpx.Response(200, json=OK)
    c = client(h)
    run(c.predict("same")); run(c.predict("same"))
    assert len(calls) == 1


def test_too_large_and_empty_not_sent():
    calls = []
    def h(req):
        calls.append(1); return httpx.Response(200, json=OK)
    c = client(h, max_log_chars=5)
    assert not run(c.predict("123456")).available and not run(c.predict("  ")).available and not calls


def test_reason_never_contains_log_text():
    r = run(client(lambda req: httpx.Response(500)).predict("SECRET-LOG-TEXT", ))
    assert "SECRET" not in r.reason


def test_warm_up():
    assert run(client(lambda r: httpx.Response(200, json={"status": "ok"})).warm_up())
    def boom(req): raise httpx.ConnectError("x")
    assert not run(client(boom).warm_up())
