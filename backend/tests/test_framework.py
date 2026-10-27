"""The framework model: validation, the digest, and where values come from."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from app.framework import DEFAULT_PATH, FIELD_MAP, FrameworkError, load_framework

SHIPPED = Path(__file__).resolve().parents[2] / DEFAULT_PATH


@pytest.fixture
def model_dict() -> dict:
    return json.loads(SHIPPED.read_text())


def write(tmp_path: Path, payload: dict) -> Path:
    target = tmp_path / "framework.json"
    target.write_text(json.dumps(payload))
    return target


class TestShippedModel:
    def test_the_committed_model_is_valid(self):
        model = load_framework(SHIPPED)
        assert model.version == "1.0.0"

    def test_it_covers_every_mapped_field(self):
        # A parameter in the map with no value in the file would silently fall
        # back to the code default, which is the drift this file exists to stop.
        flat = load_framework(SHIPPED).flat()
        assert set(flat) == set(FIELD_MAP)

    def test_axis_weights_sum_to_one(self):
        matrix = load_framework(SHIPPED).matrix
        total = matrix.w_growth + matrix.w_size + matrix.w_profitability + matrix.w_intensity
        assert total == pytest.approx(1.0)


class TestValidation:
    """A wrong parameter set is worse than a missing one: it computes, quietly."""

    @pytest.mark.parametrize(
        "group,field,value,because",
        [
            ("matrix", "w_growth", 0.5, "axis weights no longer sum to 1"),
            ("matrix", "quadrant_low_threshold", 4.0, "thresholds inverted"),
            ("matrix", "quadrant_borderline_margin", 0.6, "borderline swallows the middle quadrant"),
            ("swot", "score_4_pct", 5.0, "impact buckets no longer ascend"),
            ("swot", "neutral_band_pct", 50.0, "neutral band reaches past impact 2"),
            ("pricing", "w_cost_plus", 0.9, "blend weights no longer sum to 1"),
            ("pricing", "default_margin_basis", "PROFIT", "not a known margin basis"),
            ("market_structure", "hhi_unconcentrated_max", 3000.0, "HHI bands inverted"),
            ("porters", "attractive_below", 4.5, "Porter bands inverted"),
            ("sensitivity", "knife_edge_threshold", 2.0, "knife edge past fragile"),
            ("uncertainty", "decisive_below", 1.2, "entropy bands inverted"),
            ("uncertainty", "distribution", "GAUSSIAN", "not a supported distribution"),
            ("uncertainty", "draws", 4, "too few draws to mean anything"),
            ("benchmarks", "min_sector_n", 1, "a median of one is not a median"),
        ],
    )
    def test_an_incoherent_model_is_refused(self, model_dict, tmp_path, group, field, value, because):
        model_dict[group][field] = value
        with pytest.raises(FrameworkError):
            load_framework(write(tmp_path, model_dict))

    def test_a_missing_group_is_refused(self, model_dict, tmp_path):
        del model_dict["matrix"]
        with pytest.raises(FrameworkError):
            load_framework(write(tmp_path, model_dict))

    def test_a_bad_version_string_is_refused(self, model_dict, tmp_path):
        model_dict["version"] = "v1"
        with pytest.raises(FrameworkError):
            load_framework(write(tmp_path, model_dict))

    def test_malformed_json_is_refused(self, tmp_path):
        target = tmp_path / "framework.json"
        target.write_text("{not json")
        with pytest.raises(FrameworkError):
            load_framework(target)

    def test_a_missing_file_is_refused(self, tmp_path):
        with pytest.raises(FrameworkError):
            load_framework(tmp_path / "absent.json")


class TestDigest:
    def test_it_ignores_formatting_and_notes(self, model_dict, tmp_path):
        original = load_framework(SHIPPED).digest()

        reformatted = copy.deepcopy(model_dict)
        reformatted["_note"] = "rewritten prose, same parameters"
        reformatted["matrix"]["_note"] = "also rewritten"
        target = tmp_path / "reformatted.json"
        target.write_text(json.dumps(reformatted, indent=8, sort_keys=True))

        assert load_framework(target).digest() == original

    def test_it_changes_when_a_parameter_changes(self, model_dict, tmp_path):
        original = load_framework(SHIPPED).digest()
        model_dict["matrix"]["quadrant_borderline_margin"] = 0.2
        assert load_framework(write(tmp_path, model_dict)).digest() != original

    def test_it_does_not_change_with_the_version_field(self, model_dict, tmp_path):
        # The digest answers "were these the numbers", not "what was it called".
        original = load_framework(SHIPPED).digest()
        model_dict["version"] = "9.9.9"
        assert load_framework(write(tmp_path, model_dict)).digest() == original


class TestStamping:
    def test_a_persisted_basis_records_the_framework(self, client):
        company = client.post("/companies", json=COMPANY).json()
        basis = client.post(f"/companies/{company['id']}/swot-analysis").json()["calculation_basis"]

        stamp = basis["framework"]
        assert stamp["digest"] == load_framework(SHIPPED).digest()
        assert stamp["version"] == "1.0.0"
        assert stamp["env_overrides"] == []

    def test_every_stage_records_it(self, client):
        company = client.post("/companies", json=COMPANY).json()
        cid = company["id"]
        client.post(f"/companies/{cid}/competitors", json=COMPETITOR)

        client.post(f"/companies/{cid}/swot-analysis")
        client.post(f"/companies/{cid}/market-attractiveness")
        client.post(f"/companies/{cid}/porters-analysis")

        for path, key in [
            ("swot-analysis", "calculation_basis"),
            ("market-attractiveness", "calculation_basis"),
            ("porters-analysis", "calculation_basis"),
        ]:
            payload = client.get(f"/companies/{cid}/{path}").json()
            assert "framework" in payload[key], f"{path} did not record the framework"

    def test_the_report_context_records_it(self, client):
        company = client.post("/companies", json=COMPANY).json()
        cid = company["id"]
        client.post(f"/companies/{cid}/swot-analysis")
        client.post(f"/companies/{cid}/market-attractiveness")
        report = client.post(f"/companies/{cid}/generate-strategy-report").json()
        assert "framework" in report["structured_context"]

    def test_reading_a_result_back_does_not_restamp_it(self, client):
        """A historical result must keep the digest it was scored under.

        Reconstructing a result object from a stored row is a read. Stamping
        there would relabel old results with today's parameters, which is the
        exact claim this feature exists to make checkable.
        """
        company = client.post("/companies", json=COMPANY).json()
        cid = company["id"]
        client.post(f"/companies/{cid}/competitors", json=COMPETITOR)
        client.post(f"/companies/{cid}/swot-analysis")
        client.post(f"/companies/{cid}/market-attractiveness")
        created = client.post(
            f"/companies/{cid}/pricing-recommendation",
            json={"cost_base": 100.0, "target_margin_pct": 0.4},
        ).json()

        stored = created["calculation_basis"]["framework"]
        reread = client.get(f"/companies/{cid}/pricing-recommendation").json()
        assert reread["calculation_basis"]["framework"] == stored


class TestEndpoint:
    def test_it_serves_the_active_model(self, client):
        payload = client.get("/framework").json()
        assert payload["digest"] == load_framework(SHIPPED).digest()
        assert set(payload["parameters"]) == set(FIELD_MAP)

    def test_it_reports_nothing_overridden_by_default(self, client):
        assert client.get("/framework").json()["env_overrides"] == []


COMPANY = {
    "name": "Framework Testco",
    "industry": "saas",
    "data_source": "Unit test fixture, not a real company",
    "financial_data": {
        "revenue_growth_pct": 30.0,
        "gross_margin_pct": 80.0,
        "operating_margin_pct": 18.0,
        "net_margin_pct": 12.0,
    },
    "market_data": {
        "market_growth_rate": 0.18,
        "market_size_usd_bn": 42.0,
        "industry_avg_margin": 0.15,
    },
    "feature_scores": {"analytics": 4.0, "support": 4.0},
}

COMPETITOR = {
    "competitor_name": "Rival Inc",
    "price_point": 900.0,
    "market_share_pct": 20.0,
    "feature_scores": {"analytics": 3.0, "support": 3.0},
}
