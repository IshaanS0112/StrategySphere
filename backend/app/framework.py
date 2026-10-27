"""The framework model: every parameter that can change a computed figure.

Infrastructure lives in the environment because it cannot change an answer.
These can, so they live in one versioned file, are validated as a set rather
than one field at a time, and carry a digest that is stamped into every result.
A stored verdict therefore records the parameterisation that produced it.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, model_validator

DEFAULT_PATH = "data/framework.json"

# Model path -> Settings field. The engines keep reading `settings.<field>`, so
# nothing in services/ changes; only where the value comes from does.
FIELD_MAP: dict[str, str] = {
    "swot.neutral_band_pct": "swot_neutral_band_pct",
    "swot.score_2_pct": "swot_score_2_pct",
    "swot.score_3_pct": "swot_score_3_pct",
    "swot.score_4_pct": "swot_score_4_pct",
    "swot.score_5_pct": "swot_score_5_pct",
    "swot.min_peers_for_benchmark": "swot_min_peers_for_benchmark",
    "swot.weakness_penalty": "swot_weakness_penalty",
    "swot.neutral_impact": "swot_neutral_impact",
    "market_structure.hhi_unconcentrated_max": "hhi_unconcentrated_max",
    "market_structure.hhi_highly_concentrated_min": "hhi_highly_concentrated_min",
    "matrix.w_growth": "attractiveness_w_growth",
    "matrix.w_size": "attractiveness_w_size",
    "matrix.w_profitability": "attractiveness_w_profitability",
    "matrix.w_intensity": "attractiveness_w_intensity",
    "matrix.quadrant_high_threshold": "quadrant_high_threshold",
    "matrix.quadrant_low_threshold": "quadrant_low_threshold",
    "matrix.quadrant_borderline_margin": "quadrant_borderline_margin",
    "pricing.default_margin_basis": "pricing_default_margin_basis",
    "pricing.w_cost_plus": "pricing_w_cost_plus",
    "pricing.w_competitor": "pricing_w_competitor",
    "pricing.value_coefficient": "pricing_value_coefficient",
    "pricing.value_adjustment_cap": "pricing_value_adjustment_cap",
    "pricing.range_spread": "pricing_range_spread",
    "pricing.dispersion_warning_cv": "pricing_dispersion_warning_cv",
    "porters.composite_equal_weights": "porter_composite_equal_weights",
    "porters.min_input_coverage": "porter_min_input_coverage",
    "porters.attractive_below": "porter_attractive_below",
    "porters.unattractive_above": "porter_unattractive_above",
    "sensitivity.axis_span": "sensitivity_axis_span",
    "sensitivity.fragile_threshold": "sensitivity_fragile_threshold",
    "sensitivity.knife_edge_threshold": "sensitivity_knife_edge_threshold",
    "uncertainty.draws": "uncertainty_draws",
    "uncertainty.seed": "uncertainty_seed",
    "uncertainty.distribution": "uncertainty_distribution",
    "uncertainty.pert_lambda": "uncertainty_pert_lambda",
    "uncertainty.credible_interval_pct": "uncertainty_credible_interval_pct",
    "uncertainty.decisive_below": "uncertainty_decisive_below",
    "uncertainty.contested_at_or_above": "uncertainty_contested_at_or_above",
    "portfolio.harvest_contribution_rate": "harvest_contribution_rate",
    "validation.permutations": "validation_permutations",
    "validation.random_seed": "validation_random_seed",
    "benchmarks.min_sector_n": "edgar_min_sector_n",
    "trend.material_delta": "trend_material_delta",
}

WEIGHT_TOLERANCE = 1e-9


class FrameworkError(ValueError):
    """The model file is unusable. Loud, because every figure depends on it."""


class Swot(BaseModel):
    neutral_band_pct: float = Field(ge=0, le=100)
    score_2_pct: float = Field(gt=0, le=1000)
    score_3_pct: float = Field(gt=0, le=1000)
    score_4_pct: float = Field(gt=0, le=1000)
    score_5_pct: float = Field(gt=0, le=1000)
    min_peers_for_benchmark: int = Field(ge=1, le=1000)
    weakness_penalty: float = Field(ge=0, le=5)
    neutral_impact: float = Field(ge=1, le=5)

    @model_validator(mode="after")
    def _buckets_ascend(self) -> "Swot":
        buckets = [self.score_2_pct, self.score_3_pct, self.score_4_pct, self.score_5_pct]
        if sorted(buckets) != buckets or len(set(buckets)) != len(buckets):
            raise ValueError("swot impact buckets must strictly ascend from score_2 to score_5")
        if self.neutral_band_pct >= self.score_2_pct:
            raise ValueError("swot.neutral_band_pct must sit below score_2_pct, or no factor can score 2")
        return self


class MarketStructure(BaseModel):
    hhi_unconcentrated_max: float = Field(gt=0, le=10000)
    hhi_highly_concentrated_min: float = Field(gt=0, le=10000)

    @model_validator(mode="after")
    def _bands_ordered(self) -> "MarketStructure":
        if self.hhi_unconcentrated_max >= self.hhi_highly_concentrated_min:
            raise ValueError("hhi_unconcentrated_max must sit below hhi_highly_concentrated_min")
        return self


class Matrix(BaseModel):
    w_growth: float = Field(ge=0, le=1)
    w_size: float = Field(ge=0, le=1)
    w_profitability: float = Field(ge=0, le=1)
    w_intensity: float = Field(ge=0, le=1)
    quadrant_high_threshold: float = Field(ge=1, le=5)
    quadrant_low_threshold: float = Field(ge=1, le=5)
    quadrant_borderline_margin: float = Field(ge=0, le=2)

    @model_validator(mode="after")
    def _coherent(self) -> "Matrix":
        total = self.w_growth + self.w_size + self.w_profitability + self.w_intensity
        if abs(total - 1.0) > WEIGHT_TOLERANCE:
            raise ValueError(f"matrix axis weights must sum to 1.0, got {total!r}")
        if self.quadrant_low_threshold >= self.quadrant_high_threshold:
            raise ValueError("quadrant_low_threshold must sit below quadrant_high_threshold")
        gap = self.quadrant_high_threshold - self.quadrant_low_threshold
        if self.quadrant_borderline_margin * 2 >= gap:
            raise ValueError(
                "quadrant_borderline_margin is wide enough to swallow the middle quadrant; "
                f"it must stay below half the {gap!r} threshold gap"
            )
        return self


class Pricing(BaseModel):
    default_margin_basis: str = Field(pattern=r"^(MARGIN|MARKUP)$")
    w_cost_plus: float = Field(ge=0, le=1)
    w_competitor: float = Field(ge=0, le=1)
    value_coefficient: float = Field(ge=0, le=5)
    value_adjustment_cap: float = Field(ge=0, le=5)
    range_spread: float = Field(ge=0, le=1)
    dispersion_warning_cv: float = Field(ge=0, le=5)

    @model_validator(mode="after")
    def _blend_sums(self) -> "Pricing":
        total = self.w_cost_plus + self.w_competitor
        if abs(total - 1.0) > WEIGHT_TOLERANCE:
            raise ValueError(f"pricing blend weights must sum to 1.0, got {total!r}")
        return self


class Porters(BaseModel):
    composite_equal_weights: bool
    min_input_coverage: float = Field(ge=0, le=1)
    attractive_below: float = Field(ge=1, le=5)
    unattractive_above: float = Field(ge=1, le=5)

    @model_validator(mode="after")
    def _bands_ordered(self) -> "Porters":
        if self.attractive_below >= self.unattractive_above:
            raise ValueError("porters.attractive_below must sit below unattractive_above")
        return self


class Sensitivity(BaseModel):
    axis_span: float = Field(gt=0, le=10)
    fragile_threshold: float = Field(ge=0, le=5)
    knife_edge_threshold: float = Field(ge=0, le=5)

    @model_validator(mode="after")
    def _ordered(self) -> "Sensitivity":
        if self.knife_edge_threshold > self.fragile_threshold:
            raise ValueError("knife_edge_threshold cannot exceed fragile_threshold")
        return self


class Uncertainty(BaseModel):
    draws: int = Field(ge=100, le=1_000_000)
    seed: int
    distribution: str = Field(pattern=r"^(PERT|TRIANGULAR|UNIFORM)$")
    pert_lambda: float = Field(gt=0, le=100)
    credible_interval_pct: float = Field(gt=0, lt=100)
    decisive_below: float = Field(ge=0, le=2)
    contested_at_or_above: float = Field(ge=0, le=2)

    @model_validator(mode="after")
    def _bands_ordered(self) -> "Uncertainty":
        if self.decisive_below >= self.contested_at_or_above:
            raise ValueError("uncertainty.decisive_below must sit below contested_at_or_above")
        return self


class Portfolio(BaseModel):
    harvest_contribution_rate: float = Field(ge=0, le=1)


class Validation(BaseModel):
    permutations: int = Field(ge=1, le=1_000_000)
    random_seed: int


class Benchmarks(BaseModel):
    min_sector_n: int = Field(ge=2, le=5000)


class Trend(BaseModel):
    material_delta: float = Field(ge=0, le=4)


class FrameworkModel(BaseModel):
    """The parameterisation of the framework, validated as a whole."""

    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    swot: Swot
    market_structure: MarketStructure
    matrix: Matrix
    pricing: Pricing
    porters: Porters
    sensitivity: Sensitivity
    uncertainty: Uncertainty
    portfolio: Portfolio
    validation: Validation
    benchmarks: Benchmarks
    trend: Trend

    def flat(self) -> dict[str, Any]:
        """`{"matrix.w_growth": 0.3, ...}` - the parameters, nothing else."""
        out: dict[str, Any] = {}
        for path in FIELD_MAP:
            group, field = path.split(".")
            out[path] = getattr(getattr(self, group), field)
        return out

    def digest(self) -> str:
        """Stable over key order and formatting; changes when any value does."""
        canonical = json.dumps(self.flat(), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode()).hexdigest()[:12]


def _strip_notes(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _strip_notes(v) for k, v in value.items() if not k.startswith("_")}
    return value


def load_framework(path: str | Path) -> FrameworkModel:
    """Read and validate the model file, or raise with the reason."""
    target = Path(path)
    try:
        raw = json.loads(target.read_text())
    except FileNotFoundError as exc:
        raise FrameworkError(f"No framework model at {target}") from exc
    except json.JSONDecodeError as exc:
        raise FrameworkError(f"{target} is not valid JSON: {exc}") from exc

    try:
        return FrameworkModel.model_validate(_strip_notes(raw))
    except Exception as exc:
        # A bad parameter set is worse than a missing one: it computes, quietly.
        raise FrameworkError(f"{target} is not a usable framework model: {exc}") from exc
