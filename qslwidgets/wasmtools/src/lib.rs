use itertools::Itertools;
use js_sys::Uint8ClampedArray;
use queues::{queue, IsQueue, Queue};
use serde::Serialize;
use wasm_bindgen::prelude::{wasm_bindgen, JsValue};
use web_sys::console;

pub enum VectorError {
    IndexError,
    IncompatibleDimensions,
}

pub enum NodeState {
    Unknown,
    Matched,
    Visited,
}

fn rgb2hsv(r: i32, g: i32, b: i32) -> HSV {
    let max = std::cmp::max(std::cmp::max(r, g), b);
    let min = std::cmp::min(std::cmp::min(r, g), b);
    let d = max - min;
    let s = if max == 0 {
        0f32
    } else {
        d as f32 / max as f32
    };
    let v = max as f32 / 255.;
    let scale = (6 * d) as f32;
    let h = match max {
        x if x == min => 0f32,
        x if x == r => (g - b + d * (if g < b { 6 } else { 0 })) as f32 / scale,
        x if x == g => (b - r + d * 2) as f32 / scale,
        x if x == b => (r - g + d * 4) as f32 / scale,
        _ => 0f32,
    };
    HSV {
        h: std::cmp::min((h * 255.) as i32, 255),
        s: std::cmp::min((s * 255.) as i32, 255),
        v: std::cmp::min((v * 255.) as i32, 255),
    }
}

fn point2index(
    x: usize,
    y: usize,
    width: usize,
    height: usize,
    channels: usize,
) -> Result<usize, VectorError> {
    if x < width && y < height {
        return Ok((y * width + x) * channels);
    }
    Err(VectorError::IndexError)
}

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct HSV {
    pub h: i32,
    pub s: i32,
    pub v: i32,
}

pub struct Vector {
    dx: i32,
    dy: i32,
    di: i32,
}

const DIRECTIONS: [Vector; 4] = [
    Vector {
        dx: 0,
        dy: -1,
        di: 0,
    }, // North
    Vector {
        dx: -1,
        dy: 0,
        di: 1,
    }, // West
    Vector {
        dx: 0,
        dy: 1,
        di: 2,
    }, // South
    Vector {
        dx: 1,
        dy: 0,
        di: 3,
    }, //  East
];

#[derive(Copy, Clone)]
struct FloodFillNode {
    point: Point,
    value: HSV,
}

#[derive(Copy, Clone, Debug)]
pub struct Point {
    x: usize,
    y: usize,
}

impl Point {
    pub fn add(&self, vector: &Vector) -> Point {
        Point {
            x: (self.x as i32 + vector.dx) as usize,
            y: (self.y as i32 + vector.dy) as usize,
        }
    }
}

impl HSV {
    pub fn equals(&self, other: &HSV, threshold2: i32) -> bool {
        let dh1 = (other.h - self.h).abs();
        let dh = std::cmp::min(dh1, 255 - dh1) * 2;
        let ds = (self.s - other.s).abs();
        let dv = (self.v - other.v).abs();
        let distance = dh * dh + ds * ds + dv * dv;
        distance <= threshold2
    }
}

#[wasm_bindgen]
pub struct Image {
    dimensions: Dimensions,
    values: Option<Vec<HSV>>,
}

#[wasm_bindgen]
impl Image {
    #[wasm_bindgen(constructor)]
    pub fn new(raw: Option<Uint8ClampedArray>, width: usize, height: usize) -> Image {
        Image {
            values: match raw {
                None => None,
                Some(raw) => {
                    if raw.length() != (width * height * 4) as u32 {
                        panic!("Incompatible dimensions provided.")
                    }
                    Some(
                        raw.to_vec()
                            .into_iter()
                            .tuples()
                            .map(|(r, g, b, _)| rgb2hsv(r as i32, g as i32, b as i32))
                            .collect(),
                    )
                }
            },
            dimensions: Dimensions { width, height },
        }
    }
}

impl Image {
    pub fn get(&self, x: usize, y: usize, scale: &Scale) -> Result<HSV, VectorError> {
        match &self.values {
            Some(contents) => {
                match point2index(
                    (scale.sx * (x as f32)) as usize,
                    (scale.sy * (y as f32)) as usize,
                    self.dimensions.width,
                    self.dimensions.height,
                    1,
                ) {
                    Ok(idx) => Ok(contents[idx]),
                    Err(e) => Err(e),
                }
            }
            None => Err(VectorError::IndexError),
        }
    }
}

pub struct Scale {
    sx: f32,
    sy: f32,
}

#[wasm_bindgen]
#[derive(Copy, Clone, Debug, Serialize)]
pub struct Dimensions {
    pub width: usize,
    pub height: usize,
}

#[wasm_bindgen]
pub struct Mask {
    dimensions: Dimensions,
    values: Vec<u8>,
}

#[wasm_bindgen]
impl Mask {
    #[wasm_bindgen(constructor)]
    pub fn new(values: Option<Uint8ClampedArray>, width: usize, height: usize) -> Mask {
        return Mask {
            values: match values {
                Some(values) => {
                    if values.length() != (width * height) as u32 {
                        panic!("Detected an invalid mask.")
                    }
                    values.to_vec()
                }
                None => vec![0; width * height],
            },
            dimensions: Dimensions { width, height },
        };
    }

    pub fn from_flood(
        image: &Image,
        x: f32,
        y: f32,
        dx: f32,
        dy: f32,
        threshold: i32,
        limit: usize,
    ) -> Mask {
        flood(image, image.dimensions, x, y, dx, dy, threshold, limit)
    }

    pub fn fill_inplace(&mut self, x: usize, y: usize, width: usize, height: usize, value: u8) {
        let x1 = std::cmp::max(x, 0);
        let y1 = std::cmp::max(y, 0);
        let x2 = std::cmp::min(x + width, self.dimensions.width);
        let y2 = std::cmp::min(y + height, self.dimensions.height);
        for yi in y1..y2 {
            let i = yi * self.dimensions.width;
            self.values[i + x1..i + x2].fill(value)
        }
    }

    pub fn fill(&self, x: f32, y: f32, dx: f32, dy: f32, value: u8) -> Mask {
        let mut filled = Mask {
            values: self.values.clone(),
            dimensions: self.dimensions.clone(),
        };
        let x = ((x - dx) * self.dimensions.width as f32) as usize;
        let y = ((y - dy) * self.dimensions.height as f32) as usize;
        let width = ((dx * 2.) * self.dimensions.width as f32) as usize;
        let height = ((dy * 2.) * self.dimensions.height as f32) as usize;
        filled.fill_inplace(x, y, width, height, value);
        filled
    }

    pub fn dimensions(&self) -> JsValue {
        JsValue::from_serde(&self.dimensions).expect("Failed to serialize dimensions.")
    }

    #[wasm_bindgen]
    pub fn contents(&self) -> Vec<u8> {
        self.values.clone()
    }

    pub fn get(&self, x: f32, y: f32) -> u8 {
        match point2index(
            (x * self.dimensions.width as f32) as usize,
            (y * self.dimensions.height as f32) as usize,
            self.dimensions.width,
            self.dimensions.height,
            1,
        ) {
            Ok(start) => self.values[start],
            Err(_e) => panic!("Invalid mask index requested."),
        }
    }

    pub fn flood(
        &self,
        image: &Image,
        x: f32,
        y: f32,
        dx: f32,
        dy: f32,
        threshold: i32,
        limit: usize,
    ) -> Mask {
        let mut mask = flood(image, self.dimensions, x, y, dx, dy, threshold, limit);
        mask.values
            .iter_mut()
            .zip(&self.values)
            .for_each(|(updated, existing)| {
                if *existing == 255 {
                    *updated = 255;
                }
            });
        mask
    }
}

fn flood(
    image: &Image,
    dimensions: Dimensions,
    x: f32,
    y: f32,
    dx: f32,
    dy: f32,
    threshold: i32,
    limit: usize,
) -> Mask {
    // console::log_1(&memory());
    let mut mask = Mask {
        values: vec![0; dimensions.width * dimensions.height],
        dimensions,
    };
    let radius_vector = Vector {
        dx: (2. * dx * dimensions.width as f32) as i32,
        dy: (2. * dy * dimensions.height as f32) as i32,
        di: -1,
    };
    let point1 = Point {
        x: ((x - dx) * dimensions.width as f32) as usize,
        y: ((y - dy) * dimensions.height as f32) as usize,
    };
    let point2 = point1.add(&radius_vector);
    mask.fill_inplace(
        point1.x,
        point1.y,
        radius_vector.dx as usize,
        radius_vector.dy as usize,
        255,
    );
    let mut targets =
        vec![Point { x: 0, y: 0 }; 2 * (radius_vector.dx + radius_vector.dy) as usize];
    (point1.x..point2.x).enumerate().for_each(|(i, x)| {
        let start = 2 * i;
        targets[start] = Point { x, y: point1.y };
        targets[start + 1] = Point { x, y: point2.y };
    });
    (point1.y..point2.y).enumerate().for_each(|(i, y)| {
        let start = 2 * (radius_vector.dx as usize + i);
        targets[start] = Point { x: point1.x, y };
        targets[start + 1] = Point { x: point2.x, y };
    });
    match !image.values.is_none() && (threshold > -1) {
        true => {
            let threshold2 = threshold.pow(2);
            let mut q: Queue<FloodFillNode> = queue![];
            let scale = Scale {
                sx: image.dimensions.width as f32 / mask.dimensions.width as f32,
                sy: image.dimensions.height as f32 / mask.dimensions.height as f32,
            };
            targets
                .iter()
                .for_each(|point| match image.get(point.x, point.y, &scale) {
                    Ok(value) => {
                        q.add(FloodFillNode {
                            value,
                            point: *point,
                        })
                        .ok();
                    }
                    _ => (),
                });
            let mut count = 0;
            while q.size() > 0 && (count < limit) {
                match q.remove() {
                    Ok(node) => {
                        DIRECTIONS.iter().for_each(|vector| {
                            let point = node.point.add(&vector);
                            match mask.visit(&point, vector.di) {
                                Ok(NodeState::Matched) => (),
                                Ok(NodeState::Visited) => (),
                                Ok(NodeState::Unknown) => match image.get(point.x, point.y, &scale)
                                {
                                    Ok(value) => match value.equals(&node.value, threshold2) {
                                        true => match mask.set(&point, 255) {
                                            Ok(()) => {
                                                q.add(FloodFillNode { value, point }).ok();
                                            }
                                            _ => (),
                                        },
                                        false => (),
                                    },
                                    _ => (),
                                },
                                _ => (),
                            }
                        });
                    }
                    _ => {}
                }
                count += 1;
            }
            if count == limit {
                console::log_1(&JsValue::from("Reached iteration limit."));
            }
        }
        _ => {}
    }
    mask
}

impl Mask {
    pub fn visit(&mut self, point: &Point, direction: i32) -> Result<NodeState, VectorError> {
        match point2index(
            point.x,
            point.y,
            self.dimensions.width,
            self.dimensions.height,
            1,
        ) {
            Ok(start) => {
                let initial = self.values[start];
                if initial == 255 {
                    return Ok(NodeState::Matched);
                }
                let current = (1 << direction) as u8;
                let visited = (direction > 0) & ((initial & current) != 0);
                if visited {
                    return Ok(NodeState::Visited);
                }
                if direction > 0 {
                    self.values[start] = initial | current;
                }
                return Ok(NodeState::Unknown);
            }
            Err(e) => Err(e),
        }
    }

    pub fn set(&mut self, point: &Point, value: u8) -> Result<(), VectorError> {
        match point2index(
            point.x,
            point.y,
            self.dimensions.width,
            self.dimensions.height,
            1,
        ) {
            Ok(start) => {
                self.values[start] = value;
                Ok(())
            }
            Err(e) => Err(e),
        }
    }
}

// This is like the `main` function, except for JavaScript.
#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    // This provides better error messages in debug mode.
    // It's disabled in release mode so it doesn't bloat up the file size.
    #[cfg(debug_assertions)]
    console_error_panic_hook::set_once();
    Ok(())
}
